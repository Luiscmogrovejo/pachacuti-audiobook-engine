// src/components/player/EncryptedAudioEngine.ts -- Encrypted audio engine
// Fetches encrypted chunks -> decrypts via SubtleCrypto -> assembles Blob -> objectURL -> <audio>
// Preserves HTML5 <audio> for iOS lock screen / MediaSession support
// Same public API as AudioEngine so PlayerIsland can swap transparently

import { CHAPTER_BY_SLUG, type ChapterConfig } from '../../lib/data/chapters'
import { fetchSessionKey } from '../../lib/crypto/session.client'
import { decryptAudioChunk } from '../../lib/crypto/decrypt.client'
import type { EncryptedChunk } from '../../lib/crypto/types'

export type AudioEventCallback = (event: Event) => void

interface AudioCallbacks {
  onTimeUpdate?: (currentTime: number) => void
  onLoadedMetadata?: (duration: number) => void
  onEnded?: () => void
  onCanPlay?: () => void
  onError?: (error: Event) => void
}

/**
 * EncryptedAudioEngine: fetches encrypted audio chunks, decrypts in memory,
 * assembles into a Blob objectURL, and feeds it to an HTML5 <audio> element.
 *
 * This preserves:
 * - iOS lock screen / MediaSession integration
 * - Native playbackRate control
 * - Native seeking within the decrypted audio
 * - Volume fade via audio.volume (same as AudioEngine)
 *
 * The key difference from AudioEngine is how the audio source is obtained:
 * - AudioEngine: audio.src = "/api/audio/stream?token=..."
 * - EncryptedAudioEngine: audio.src = URL.createObjectURL(decryptedBlob)
 */
export class EncryptedAudioEngine {
  private audio: HTMLAudioElement | null = null
  private targetVolume = 1.0
  private callbacks: AudioCallbacks = {}
  private fadeRafId: number | null = null
  private currentObjectURL: string | null = null
  private loadAbortController: AbortController | null = null

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
   * Load a chapter's encrypted audio.
   * Fetches manifest -> fetches chunks -> decrypts -> Blob -> objectURL -> audio.src
   */
  loadChapter(slug: string, lang: 'es' | 'en'): void {
    const chapter: ChapterConfig | undefined = CHAPTER_BY_SLUG.get(slug)
    if (!chapter) return

    const audioFile = lang === 'es' ? chapter.audioFileEs : chapter.audioFileEn
    if (!audioFile) return

    // Lazy creation of audio element
    if (!this.audio) {
      this.audio = document.createElement('audio')
      this.audio.preload = 'auto'
      this.wireEvents()
    }

    // Abort any in-progress load
    if (this.loadAbortController) {
      this.loadAbortController.abort()
    }
    this.loadAbortController = new AbortController()

    // Start the async load process
    this.loadEncryptedAudio(slug, lang, this.loadAbortController.signal)
  }

  /**
   * Play with a smooth volume fade-in.
   */
  async fadeInAndPlay(duration = 200): Promise<boolean> {
    if (!this.audio) return false
    this.cancelFade()

    this.audio.volume = 0
    try {
      await this.audio.play()
    } catch {
      return false
    }

    this.fadeVolume(0, this.targetVolume, duration)
    return true
  }

  /**
   * Pause with immediate stop (fade is cosmetic only).
   */
  fadeAndPause(_duration = 200): void {
    if (!this.audio) return
    this.cancelFade()
    this.audio.pause()
    this.audio.volume = this.targetVolume
  }

  /** Set playback speed */
  setSpeed(rate: number): void {
    if (this.audio) this.audio.playbackRate = rate
  }

  /** Skip forward */
  skipForward(seconds = 30): void {
    if (!this.audio) return
    this.audio.currentTime = Math.min(
      this.audio.currentTime + seconds,
      this.audio.duration || Infinity,
    )
  }

  /** Skip backward */
  skipBack(seconds = 15): void {
    if (!this.audio) return
    this.audio.currentTime = Math.max(this.audio.currentTime - seconds, 0)
  }

  /** Seek to specific time */
  seek(time: number): void {
    if (!this.audio) return
    this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0))
  }

  /** Get current playback time */
  getCurrentTime(): number {
    return this.audio?.currentTime ?? 0
  }

  /** Get total duration */
  getDuration(): number {
    return this.audio?.duration ?? 0
  }

  /** Check if audio is currently playing */
  isAudioPlaying(): boolean {
    return this.audio ? !this.audio.paused && !this.audio.ended : false
  }

  /** Clean up resources */
  destroy(): void {
    this.cancelFade()
    if (this.loadAbortController) {
      this.loadAbortController.abort()
      this.loadAbortController = null
    }
    this.revokeCurrentURL()
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
  }

  // --- Private methods ---

  /**
   * Fetch manifest, fetch all chunks, decrypt, assemble Blob, set audio.src.
   * "Wait for all chunks" approach (simpler, reliable).
   */
  private async loadEncryptedAudio(
    slug: string,
    lang: 'es' | 'en',
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.audio) return

    try {
      // 1. Get session key
      const { cryptoKey } = await fetchSessionKey()
      if (signal.aborted) return

      // 2. Fetch manifest metadata (chunk count)
      const manifestRes = await fetch(
        `/api/audio/manifest/${slug}?lang=${lang}`,
        { signal },
      )
      if (!manifestRes.ok) {
        throw new Error(`Manifest fetch failed: ${manifestRes.status}`)
      }
      const manifestData = await manifestRes.json()
      const chunkCount = manifestData.chunkCount as number
      if (signal.aborted) return

      // 3. Fetch and decrypt all chunks
      const decryptedBuffers: ArrayBuffer[] = []

      for (let i = 0; i < chunkCount; i++) {
        if (signal.aborted) return

        const chunkRes = await fetch(
          `/api/audio/encrypted/${slug}?lang=${lang}&chunk=${i}`,
          { signal },
        )
        if (!chunkRes.ok) {
          throw new Error(`Chunk ${i} fetch failed: ${chunkRes.status}`)
        }
        const chunkData = (await chunkRes.json()) as EncryptedChunk
        if (signal.aborted) return

        // Decrypt the chunk
        const decrypted = await decryptAudioChunk(chunkData, cryptoKey)
        decryptedBuffers.push(decrypted)
      }

      if (signal.aborted) return

      // 4. Assemble into Blob + objectURL
      const blob = new Blob(decryptedBuffers, { type: 'audio/mpeg' })
      const objectURL = URL.createObjectURL(blob)

      // 5. Revoke previous objectURL
      this.revokeCurrentURL()
      this.currentObjectURL = objectURL

      // 6. Set audio source
      if (this.audio) {
        this.audio.src = objectURL
        this.audio.load()
      }
    } catch (err) {
      if (signal.aborted) return
      // On failure, fire error callback
      this.callbacks.onError?.(new Event('error'))
    }
  }

  /** Revoke the current object URL to free memory */
  private revokeCurrentURL(): void {
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL)
      this.currentObjectURL = null
    }
  }

  /** Wire HTML5 audio events to callbacks */
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

    this.audio.addEventListener('error', () => {
      this.callbacks.onError?.(new Event('error'))
    })
  }

  /** Animate volume using rAF */
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

  /** Cancel any in-progress volume fade */
  private cancelFade(): void {
    if (this.fadeRafId !== null) {
      cancelAnimationFrame(this.fadeRafId)
      this.fadeRafId = null
    }
  }
}
