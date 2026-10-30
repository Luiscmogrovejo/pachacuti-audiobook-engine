// src/components/player/AudioEngine.ts -- HTML5 <audio> element manager
// Uses audio.volume for fade (NOT Web Audio API) for iOS lock screen support
// Audio served via signed JWT tokens (PROT-01) with fallback to direct paths

import { CHAPTER_BY_SLUG, type ChapterConfig } from '../../lib/data/chapters'

export type AudioEventCallback = (event: Event) => void

interface AudioCallbacks {
  onTimeUpdate?: (currentTime: number) => void
  onLoadedMetadata?: (duration: number) => void
  onEnded?: () => void
  onCanPlay?: () => void
  onError?: (error: Event) => void
}

/** Cached token state to avoid re-fetching on every seek */
interface TokenCache {
  chapter: string
  lang: 'es' | 'en'
  voice: 'female' | 'male'
  token: string
  fetchedAt: number
}

/** Token is considered stale after 4 minutes (tokens expire at 5 min) */
const TOKEN_STALE_MS = 4 * 60 * 1000

/** Proactive refresh fires at 3.5 minutes -- well before the 5-min expiry */
const TOKEN_REFRESH_MS = 3.5 * 60 * 1000

/**
 * AudioEngine manages a single HTML5 <audio> element for chapter playback.
 * Created lazily on first loadChapter() call to avoid SSR issues.
 *
 * Key design:
 * - HTML5 <audio> only (no AudioContext/GainNode) for iOS lock screen support
 * - Volume fade via requestAnimationFrame (200ms default)
 * - Playback speed via audio.playbackRate
 * - Signed JWT tokens for audio access (PROT-01) with direct path fallback
 * - Proactive token refresh for long listening sessions (PROT-06)
 */
export class AudioEngine {
  private audio: HTMLAudioElement | null = null
  private targetVolume = 1.0
  private callbacks: AudioCallbacks = {}
  private fadeRafId: number | null = null
  private tokenCache: TokenCache | null = null
  private retryCount = 0
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null
  private currentVoice: 'female' | 'male' = 'female'

  /**
   * Register event callbacks. Call before loadChapter().
   */
  setCallbacks(callbacks: AudioCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * Get the raw HTMLAudioElement (needed for Media Session position state).
   */
  getAudioElement(): HTMLAudioElement | null {
    return this.audio
  }

  /**
   * Load a chapter's audio file. Creates the <audio> element on first call.
   * Fetches a signed JWT token first, falling back to direct path on failure.
   *
   * @param slug - Chapter slug (e.g., 'prologue', 'chapter-01')
   * @param lang - Language code ('es' or 'en')
   * @param voice - Voice gender ('female' or 'male', defaults to 'female')
   */
  loadChapter(slug: string, lang: 'es' | 'en', voice: 'female' | 'male' = 'female'): void {
    const chapter: ChapterConfig | undefined = CHAPTER_BY_SLUG.get(slug)
    if (!chapter) return

    const audioFile = lang === 'es' ? chapter.audioFileEs : chapter.audioFileEn
    if (!audioFile) return // Chapters 13-23 have no audio yet

    // Store voice for refresh use
    this.currentVoice = voice

    // Lazy creation of audio element (avoids SSR)
    if (!this.audio) {
      this.audio = document.createElement('audio')
      this.audio.preload = 'auto'
      this.wireEvents()
    }

    // Reset retry counter for new chapter loads
    this.retryCount = 0

    // Attempt to fetch signed token, then set src
    this.fetchTokenAndSetSrc(slug, lang, audioFile, voice)
  }

  /**
   * Play with a smooth volume fade-in (200ms by default).
   * Sets volume to 0, starts playback, then ramps to targetVolume.
   * Returns false if play was rejected (autoplay policy) so the caller
   * can revert the store's isPlaying flag.
   */
  async fadeInAndPlay(duration = 200): Promise<boolean> {
    if (!this.audio) return false
    this.cancelFade()

    this.audio.volume = 0
    try {
      await this.audio.play()
    } catch {
      // Play promise rejected (user gesture required, etc.)
      return false
    }

    this.fadeVolume(0, this.targetVolume, duration)
    return true
  }

  /**
   * Pause with a smooth volume fade-out (200ms by default).
   * Ramps volume to 0, then calls audio.pause(), then restores volume.
   * Also immediately pauses the audio element to guarantee stop -- the fade
   * is cosmetic only. This prevents audio from continuing during the 200ms
   * fade window if the component unmounts or the user navigates away.
   */
  fadeAndPause(_duration = 200): void {
    if (!this.audio) return
    this.cancelFade()

    // Immediately pause to guarantee audio stops -- fixes "player won't stop" bug.
    // The fade below is purely cosmetic for cases where the element persists.
    this.audio.pause()
    this.audio.volume = this.targetVolume
  }

  /**
   * Set playback speed (PLAY-02).
   */
  setSpeed(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = rate
    }
  }

  /**
   * Skip forward by given seconds (PLAY-03, default 30s).
   */
  skipForward(seconds = 30): void {
    if (!this.audio) return
    this.audio.currentTime = Math.min(
      this.audio.currentTime + seconds,
      this.audio.duration || Infinity,
    )
  }

  /**
   * Skip backward by given seconds (PLAY-03, default 15s).
   */
  skipBack(seconds = 15): void {
    if (!this.audio) return
    this.audio.currentTime = Math.max(this.audio.currentTime - seconds, 0)
  }

  /**
   * Seek to a specific time (PLAY-01).
   */
  seek(time: number): void {
    if (!this.audio) return
    this.audio.currentTime = Math.max(
      0,
      Math.min(time, this.audio.duration || 0),
    )
  }

  /**
   * Get current playback time.
   */
  getCurrentTime(): number {
    return this.audio?.currentTime ?? 0
  }

  /**
   * Get total duration.
   */
  getDuration(): number {
    return this.audio?.duration ?? 0
  }

  /**
   * Check if audio is currently playing.
   */
  isAudioPlaying(): boolean {
    return this.audio ? !this.audio.paused && !this.audio.ended : false
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.cancelFade()
    this.cancelRefreshTimer()
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
    this.tokenCache = null
  }

  // --- Private methods ---

  /**
   * Fetch a signed audio token, then set the audio src to the stream endpoint.
   * Falls back to direct file path if token fetch fails (dev mode, API unavailable).
   */
  private async fetchTokenAndSetSrc(
    slug: string,
    lang: 'es' | 'en',
    audioFile: string,
    voice: 'female' | 'male' = 'female',
  ): Promise<void> {
    if (!this.audio) return

    // Check cached token: reuse if same chapter/lang/voice and not stale
    if (
      this.tokenCache &&
      this.tokenCache.chapter === slug &&
      this.tokenCache.lang === lang &&
      this.tokenCache.voice === voice &&
      Date.now() - this.tokenCache.fetchedAt < TOKEN_STALE_MS
    ) {
      const src = `/api/audio/stream?token=${this.tokenCache.token}`
      if (this.audio.src !== new URL(src, window.location.origin).href) {
        this.audio.src = src
        this.audio.load()
      }
      return
    }

    try {
      const response = await fetch(`/api/audio/token?chapter=${slug}&lang=${lang}&voice=${voice}`)

      // 401/402 = access denied (signup/paid gate). Do NOT fallback — stop here.
      if (response.status === 401 || response.status === 402) {
        this.callbacks.onError?.(new Event('error'))
        return
      }

      if (!response.ok) throw new Error(`Token fetch failed: ${response.status}`)

      const data = await response.json()
      const token = data.token as string

      // Cache the token
      this.tokenCache = { chapter: slug, lang, voice, token, fetchedAt: Date.now() }

      const src = `/api/audio/stream?token=${token}`
      if (this.audio.src !== new URL(src, window.location.origin).href) {
        this.audio.src = src
        this.audio.load()
      }

      // Schedule proactive refresh for long listening sessions (PROT-06)
      this.scheduleTokenRefresh(slug, lang, audioFile, voice)
    } catch {
      // Network error or API unavailable — do NOT fallback to direct paths.
      // Direct audio paths are blocked by middleware (403).
      this.callbacks.onError?.(new Event('error'))
    }
  }

  /**
   * Schedule a proactive token refresh before the current token expires.
   * Fires at TOKEN_REFRESH_MS (3.5 min) after last fetch, re-fetches silently
   * without interrupting playback. Only refreshes if audio is actively playing.
   */
  private scheduleTokenRefresh(slug: string, lang: 'es' | 'en', audioFile: string, voice: 'female' | 'male' = 'female'): void {
    this.cancelRefreshTimer()

    this.refreshTimerId = setTimeout(async () => {
      // Only refresh if still playing the same chapter
      if (
        !this.audio ||
        !this.tokenCache ||
        this.tokenCache.chapter !== slug ||
        this.tokenCache.lang !== lang ||
        this.audio.paused
      ) {
        return
      }

      try {
        const response = await fetch(`/api/audio/token?chapter=${slug}&lang=${lang}&voice=${voice}`)
        if (!response.ok) return

        const data = await response.json()
        const token = data.token as string

        // Update cache silently -- do NOT change audio.src (would restart playback)
        this.tokenCache = { chapter: slug, lang, voice, token, fetchedAt: Date.now() }

        // Schedule the next refresh
        this.scheduleTokenRefresh(slug, lang, audioFile, voice)
      } catch {
        // Silently fail -- the existing token still has ~1.5 min left
        // The 403 retry handler will catch it if needed
      }
    }, TOKEN_REFRESH_MS)
  }

  /**
   * Cancel any pending proactive token refresh timer.
   */
  private cancelRefreshTimer(): void {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId)
      this.refreshTimerId = null
    }
  }

  /**
   * Refresh the token and update the audio src (called on 403 error).
   * Limits retry to 1 attempt to prevent infinite loops.
   */
  private async refreshToken(): Promise<void> {
    if (!this.audio || !this.tokenCache || this.retryCount >= 1) return
    this.retryCount++

    const { chapter: slug, lang, voice } = this.tokenCache
    const chapterConfig = CHAPTER_BY_SLUG.get(slug)
    if (!chapterConfig) return

    const audioFile = lang === 'es' ? chapterConfig.audioFileEs : chapterConfig.audioFileEn
    if (!audioFile) return

    // Clear stale cache
    this.tokenCache = null

    // Re-fetch with fresh token
    await this.fetchTokenAndSetSrc(slug, lang, audioFile, voice)
  }

  /**
   * Wire HTML5 audio events to callbacks.
   */
  private wireEvents(): void {
    if (!this.audio) return

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio && this.callbacks.onTimeUpdate) {
        this.callbacks.onTimeUpdate(this.audio.currentTime)
      }
    })

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio && this.callbacks.onLoadedMetadata) {
        this.callbacks.onLoadedMetadata(this.audio.duration)
      }
    })

    this.audio.addEventListener('ended', () => {
      this.callbacks.onEnded?.()
    })

    this.audio.addEventListener('canplay', () => {
      this.callbacks.onCanPlay?.()
    })

    this.audio.addEventListener('error', async () => {
      // On error, check if it's a 403 (token expired) -- attempt one refresh
      if (this.tokenCache && this.retryCount < 1) {
        await this.refreshToken()
      } else {
        this.callbacks.onError?.(new Event('error'))
      }
    })
  }

  /**
   * Animate volume from startVol to endVol over duration ms using rAF.
   */
  private fadeVolume(
    startVol: number,
    endVol: number,
    duration: number,
    onComplete?: () => void,
  ): void {
    if (!this.audio || duration <= 0) {
      if (this.audio) this.audio.volume = endVol
      onComplete?.()
      return
    }

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (this.audio) {
        this.audio.volume = startVol + (endVol - startVol) * progress
      }

      if (progress < 1) {
        this.fadeRafId = requestAnimationFrame(step)
      } else {
        this.fadeRafId = null
        onComplete?.()
      }
    }

    this.fadeRafId = requestAnimationFrame(step)
  }

  /**
   * Cancel any in-progress volume fade.
   */
  private cancelFade(): void {
    if (this.fadeRafId !== null) {
      cancelAnimationFrame(this.fadeRafId)
      this.fadeRafId = null
    }
  }
}
