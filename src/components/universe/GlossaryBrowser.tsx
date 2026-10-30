import React, { useState, useMemo, useRef, type JSX } from 'react';
import { useLanguage } from '../../lib/i18n/useLanguage';

interface GlossaryEntry {
  word: string;
  pronunciation: string;
  translation: string;
  category: 'persona' | 'lugar' | 'objeto' | 'concepto' | 'expresion';
  culturalNote: string;
  firstChapter: number;
  chapterSlug: string;
  contextSentence: string;
}

interface Props {
  entries: GlossaryEntry[];
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function slugify(word: string): string {
  return word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function GlossaryBrowser({ entries }: Props): JSX.Element {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const CATEGORY_LABELS: Record<string, string> = {
    persona: t('glossary.persona'),
    lugar: t('glossary.lugar'),
    objeto: t('glossary.objeto'),
    concepto: t('glossary.concepto'),
    expresion: t('glossary.expresion'),
  };

  const availableLetters = useMemo(
    () => new Set(entries.map((e) => e.word[0].toUpperCase())),
    [entries]
  );

  const filtered = useMemo(() => {
    let result = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.word.toLowerCase().includes(q) ||
          e.translation.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (selectedLetter) {
      result = result.filter(
        (e) => e.word[0].toUpperCase() === selectedLetter
      );
    }
    return result;
  }, [entries, searchQuery, selectedCategory, selectedLetter]);

  function playAudio(word: string) {
    const slug = slugify(word);
    if (playingSlug === slug && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingSlug(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`/audio/glossary/${slug}.mp3`);
    audioRef.current = audio;
    setPlayingSlug(slug);
    audio.play().catch(() => setPlayingSlug(null));
    audio.addEventListener('ended', () => {
      setPlayingSlug(null);
      audioRef.current = null;
    });
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Letter navigation */}
      <div className="flex flex-wrap gap-1 mb-6" role="navigation" aria-label="Letter filter">
        <button
          onClick={() => setSelectedLetter(null)}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            selectedLetter === null
              ? 'bg-[#d4a843] text-[#1a0800]'
              : 'text-[rgba(240,230,211,0.7)] hover:text-[#d4a843]'
          }`}
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {t('glossary.all')}
        </button>
        {LETTERS.map((letter) => {
          const hasEntries = availableLetters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => hasEntries && setSelectedLetter(selectedLetter === letter ? null : letter)}
              disabled={!hasEntries}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                selectedLetter === letter
                  ? 'bg-[#d4a843] text-[#1a0800]'
                  : hasEntries
                    ? 'text-[rgba(240,230,211,0.7)] hover:text-[#d4a843]'
                    : 'text-[rgba(240,230,211,0.3)] pointer-events-none'
              }`}
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('glossary.search')}
          className="w-full rounded-lg bg-[#3a2a1a]/50 border border-[#d4a843]/20 text-[#f0e6d3] px-4 py-3 placeholder:text-[rgba(240,230,211,0.4)] focus:outline-none focus:border-[#d4a843]/50 transition-colors"
          style={{ fontFamily: "'Crimson Text', serif" }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(240,230,211,0.4)] hover:text-[#d4a843] transition-colors text-lg"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
            className={`rounded-full px-3 py-1 text-xs border transition-colors ${
              selectedCategory === key
                ? 'bg-[#d4a843]/20 border-[#d4a843] text-[#d4a843]'
                : 'border-[#d4a843]/20 text-[rgba(240,230,211,0.7)] hover:border-[#d4a843]/40'
            }`}
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-[rgba(240,230,211,0.4)] mb-4" style={{ fontFamily: "'Crimson Text', serif" }}>
        {t('glossary.showing', { filtered: filtered.length, total: entries.length })}
      </p>

      {/* Results list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[rgba(240,230,211,0.7)] text-lg" style={{ fontFamily: "'Crimson Text', serif" }}>
            {t('glossary.noResults')} &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setSelectedLetter(null);
            }}
            className="mt-4 text-sm text-[#d4a843] hover:text-[#f5d16c] transition-colors"
          >
            {t('glossary.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedWord === entry.word;
            const slug = slugify(entry.word);
            const isPlaying = playingSlug === slug;

            return (
              <div
                key={entry.word}
                className="border border-[#d4a843]/10 rounded-lg overflow-hidden transition-colors hover:border-[#d4a843]/25"
              >
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedWord(isExpanded ? null : entry.word)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isExpanded}
                >
                  {/* Audio play button */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(entry.word);
                    }}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-[#d4a843] border-[#d4a843] text-[#1a0800]'
                        : 'border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/10'
                    }`}
                    role="button"
                    aria-label={isPlaying ? `Pause ${entry.word}` : `Play ${entry.word}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        playAudio(entry.word);
                      }
                    }}
                  >
                    {isPlaying ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="2" y="1" width="3" height="10" />
                        <rect x="7" y="1" width="3" height="10" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <polygon points="2,0 12,6 2,12" />
                      </svg>
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[#d4a843] font-bold"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {entry.word}
                    </span>
                    <span className="text-[rgba(240,230,211,0.4)] italic ml-2 text-sm">
                      [{entry.pronunciation}]
                    </span>
                    <span className="text-[rgba(240,230,211,0.7)] ml-2 text-sm hidden sm:inline">
                      {entry.translation}
                    </span>
                  </div>

                  {/* Expand indicator */}
                  <svg
                    className={`flex-shrink-0 w-4 h-4 text-[rgba(240,230,211,0.4)] transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Mobile translation (visible only when collapsed on small screens) */}
                {!isExpanded && (
                  <div className="px-4 pb-2 -mt-1 sm:hidden">
                    <span className="text-[rgba(240,230,211,0.7)] text-sm">
                      {entry.translation}
                    </span>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#d4a843]/10 pt-3 space-y-3">
                    <p className="text-[rgba(240,230,211,0.7)] text-sm sm:hidden">
                      {entry.translation}
                    </p>
                    <p
                      className="text-[rgba(240,230,211,0.7)] text-sm leading-relaxed"
                      style={{ fontFamily: "'Crimson Text', serif" }}
                    >
                      {entry.culturalNote}
                    </p>
                    <p
                      className="text-[rgba(240,230,211,0.4)] text-sm italic"
                      style={{ fontFamily: "'Crimson Text', serif" }}
                    >
                      &ldquo;{entry.contextSentence}&rdquo;
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full px-2 py-0.5 bg-[#d4a843]/10 border border-[#d4a843]/20 text-[#d4a843]">
                        {CATEGORY_LABELS[entry.category] || entry.category}
                      </span>
                      <a
                        href={`/listen/${entry.chapterSlug}`}
                        className="text-[#d4a843] hover:text-[#f5d16c] transition-colors"
                      >
                        {t('glossary.firstAppears', { chapter: entry.firstChapter })}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
