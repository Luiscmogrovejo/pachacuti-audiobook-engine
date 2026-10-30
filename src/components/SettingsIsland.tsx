import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePlayerStore, SPEED_OPTIONS, type PlaybackSpeed } from './player/player-store';
import { useLanguage } from '../lib/i18n/useLanguage';

/** Toast notification that fades in and out */
function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      style={{ fontFamily: "'Cinzel', serif" }}
      role="status"
      aria-live="polite"
    >
      <span data-testid="settings-saved-toast">
        {/* Will be set by language */}
      </span>
    </div>
  );
}

export function SettingsIsland() {
  const { lang, t } = useLanguage();
  const speed = usePlayerStore((s) => s.speed);
  const setSpeed = usePlayerStore((s) => s.setSpeed);
  const bookmarks = usePlayerStore((s) => s.bookmarks);
  const language = usePlayerStore((s) => s.language);
  const setLanguage = usePlayerStore((s) => s.setLanguage);

  // Local state for accessibility settings
  const [fontScale, setFontScale] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem('pachacuti-font-scale');
      if (savedScale) setFontScale(parseFloat(savedScale));
      setReducedMotion(localStorage.getItem('pachacuti-reduce-motion') === 'true');
      setHighContrast(localStorage.getItem('pachacuti-high-contrast') === 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  /** Show a brief "Saved" toast */
  const showToast = useCallback(() => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  /** Handle font scale change */
  const handleFontScale = useCallback((value: number) => {
    setFontScale(value);
    document.documentElement.style.setProperty('--user-font-scale', String(value));
    try { localStorage.setItem('pachacuti-font-scale', String(value)); } catch {}
    showToast();
  }, [showToast]);

  /** Handle reduced motion toggle */
  const handleReducedMotion = useCallback((checked: boolean) => {
    setReducedMotion(checked);
    if (checked) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    try { localStorage.setItem('pachacuti-reduce-motion', String(checked)); } catch {}
    showToast();
  }, [showToast]);

  /** Handle high contrast toggle */
  const handleHighContrast = useCallback((checked: boolean) => {
    setHighContrast(checked);
    if (checked) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    try { localStorage.setItem('pachacuti-high-contrast', String(checked)); } catch {}
    showToast();
  }, [showToast]);

  /** Handle speed change */
  const handleSpeedChange = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed);
    showToast();
  }, [setSpeed, showToast]);

  /** Handle language toggle */
  const handleLanguageToggle = useCallback(() => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    // Set cookie for SSR
    document.cookie = `pachacuti-lang=${newLang};path=/;max-age=31536000;SameSite=Lax`;
    showToast();
    // Reload to apply SSR language changes
    setTimeout(() => window.location.reload(), 300);
  }, [language, setLanguage, showToast]);

  /** Clear listening history */
  const handleClearHistory = useCallback(() => {
    const msg = lang === 'en'
      ? 'Clear all listening history? This cannot be undone.'
      : 'Borrar todo el historial de escucha? Esta accion no se puede deshacer.';
    if (!window.confirm(msg)) return;
    const store = usePlayerStore.getState();
    store.setChapter('');
    store.setCurrentTime(0);
    store.setDuration(0);
    store.setSentences([]);
    store.setCurrentSentenceIndex(-1);
    showToast();
  }, [lang, showToast]);

  /** Clear bookmarks */
  const handleClearBookmarks = useCallback(() => {
    const msg = lang === 'en'
      ? `Clear all ${bookmarks.length} bookmarks? This cannot be undone.`
      : `Borrar los ${bookmarks.length} marcadores? Esta accion no se puede deshacer.`;
    if (!window.confirm(msg)) return;
    // Remove all bookmarks one by one
    const state = usePlayerStore.getState();
    state.bookmarks.forEach((bm) => state.removeBookmark(bm.id));
    showToast();
  }, [lang, bookmarks.length, showToast]);

  const sectionClass = 'border border-gold/10 rounded-lg p-5 md:p-6 space-y-4';
  const headingClass = 'font-heading text-gold text-sm uppercase tracking-wider';
  const labelClass = 'text-text-secondary text-sm font-body';

  return (
    <div className="space-y-6" data-testid="settings-island">
      {/* Language Section */}
      <section className={sectionClass} data-testid="settings-language">
        <h2 className={headingClass}>{t('page.settings.language')}</h2>
        <div className="flex items-center justify-between">
          <span className={labelClass}>
            {language === 'es' ? 'Espanol' : 'English'}
          </span>
          <button
            onClick={handleLanguageToggle}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-gold/20 text-gold text-sm hover:bg-gold/10 transition-colors"
            style={{ fontFamily: "'Cinzel', serif" }}
            data-testid="settings-language-toggle"
          >
            {t('lang.switch')}
          </button>
        </div>
      </section>

      {/* Playback Section */}
      <section className={sectionClass} data-testid="settings-playback">
        <h2 className={headingClass}>{t('page.settings.playback')}</h2>
        <div>
          <span className={`${labelClass} block mb-3`}>
            {lang === 'en' ? 'Playback Speed' : 'Velocidad de reproduccion'}
          </span>
          <div className="flex flex-wrap gap-2">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSpeedChange(opt)}
                className={`min-w-[48px] min-h-[44px] px-3 py-2 rounded-lg border text-sm transition-colors ${
                  speed === opt
                    ? 'border-gold/40 bg-gold/15 text-gold'
                    : 'border-gold/10 text-text-dim hover:border-gold/20 hover:text-text-secondary'
                }`}
                aria-pressed={speed === opt}
                data-testid={`speed-option-${opt}`}
              >
                {opt}x
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={`${labelClass} block mb-2`}>
            {t('page.settings.audio')}
          </span>
          <span className="text-text-dim text-xs italic">
            {lang === 'en' ? 'Standard quality (128kbps)' : 'Calidad estandar (128kbps)'}
          </span>
        </div>
      </section>

      {/* Accessibility Section */}
      <section className={sectionClass} data-testid="settings-accessibility">
        <h2 className={headingClass}>{t('page.settings.accessibility')}</h2>

        {/* Font size slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="font-scale" className={labelClass}>
              {t('page.settings.fontSize')}
            </label>
            <span className="text-text-dim text-xs tabular-nums">
              {Math.round(fontScale * 100)}%
            </span>
          </div>
          <input
            id="font-scale"
            type="range"
            min="0.8"
            max="1.4"
            step="0.05"
            value={fontScale}
            onChange={(e) => handleFontScale(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #d4a843 ${((fontScale - 0.8) / 0.6) * 100}%, rgba(212,168,67,0.15) ${((fontScale - 0.8) / 0.6) * 100}%)`,
            }}
            data-testid="font-scale-slider"
          />
          <div className="flex justify-between text-[10px] text-text-dim mt-1">
            <span>A</span>
            <span style={{ fontSize: '14px' }}>A</span>
          </div>
        </div>

        {/* High contrast toggle */}
        <div className="flex items-center justify-between min-h-[44px]">
          <label htmlFor="high-contrast" className={labelClass}>
            {t('page.settings.contrast')}
          </label>
          <button
            id="high-contrast"
            role="switch"
            aria-checked={highContrast}
            onClick={() => handleHighContrast(!highContrast)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              highContrast ? 'bg-gold/40' : 'bg-stone/60'
            }`}
            data-testid="high-contrast-toggle"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-text-primary transition-transform ${
                highContrast ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Reduced motion toggle */}
        <div className="flex items-center justify-between min-h-[44px]">
          <label htmlFor="reduced-motion" className={labelClass}>
            {t('page.settings.reducedMotion')}
          </label>
          <button
            id="reduced-motion"
            role="switch"
            aria-checked={reducedMotion}
            onClick={() => handleReducedMotion(!reducedMotion)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              reducedMotion ? 'bg-gold/40' : 'bg-stone/60'
            }`}
            data-testid="reduced-motion-toggle"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-text-primary transition-transform ${
                reducedMotion ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Privacy Section */}
      <section className={sectionClass} data-testid="settings-privacy">
        <h2 className={headingClass}>{t('page.settings.privacy')}</h2>
        <div className="space-y-3">
          <button
            onClick={handleClearHistory}
            className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-red-900/30 text-red-400/80 text-sm hover:bg-red-900/10 hover:border-red-900/50 transition-colors text-left"
            data-testid="clear-history-btn"
          >
            {t('page.settings.clearHistory')}
          </button>
          <button
            onClick={handleClearBookmarks}
            className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-red-900/30 text-red-400/80 text-sm hover:bg-red-900/10 hover:border-red-900/50 transition-colors text-left"
            data-testid="clear-bookmarks-btn"
          >
            {t('page.settings.clearBookmarks')}
            {bookmarks.length > 0 && (
              <span className="text-text-dim text-xs ml-2">({bookmarks.length})</span>
            )}
          </button>
        </div>
      </section>

      {/* Saved toast */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-sm transition-all duration-300 pointer-events-none ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
        style={{ fontFamily: "'Cinzel', serif" }}
        role="status"
        aria-live="polite"
        data-testid="settings-saved-toast"
      >
        {t('page.settings.saved')}
      </div>
    </div>
  );
}
