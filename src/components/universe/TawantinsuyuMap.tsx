import React, { useState, useEffect, useMemo, type JSX } from 'react';
import type { MapLocation } from '../../lib/data/map-locations';
import { PERU_OUTLINE_PATH, geoToSvg } from '../../lib/data/map-locations';
import { useLanguage } from '../../lib/i18n/useLanguage';

interface Props {
  locations: MapLocation[];
  journeyPath: number[];
}

/** Free chapters are always revealed */
const FREE_CHAPTERS = new Set([0, 1, 2]);

/** Attempt to read progress from localStorage */
function getRevealedChapters(): Set<number> {
  const revealed = new Set(FREE_CHAPTERS);
  try {
    const stored = localStorage.getItem('pachacuti-player');
    if (stored) {
      const data = JSON.parse(stored);
      const state = data?.state || data;
      if (state?.currentChapterSlug) {
        const slug = state.currentChapterSlug;
        if (slug === 'prologue') revealed.add(0);
        else {
          const match = slug.match(/chapter-(\d+)/);
          if (match) revealed.add(parseInt(match[1], 10));
        }
      }
      if (Array.isArray(state?.bookmarks)) {
        state.bookmarks.forEach((bm: { chapterSlug?: string }) => {
          if (bm.chapterSlug === 'prologue') revealed.add(0);
          else {
            const m = bm.chapterSlug?.match(/chapter-(\d+)/);
            if (m) revealed.add(parseInt(m[1], 10));
          }
        });
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }
  return revealed;
}

/** SVG filter for gold glow on revealed locations */
const GOLD_GLOW_FILTER = (
  <defs>
    <filter id="gold-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
      <feColorMatrix
        in="blur"
        type="matrix"
        values="1 0 0 0 0.83  0 1 0 0 0.66  0 0 1 0 0.26  0 0 0 0.6 0"
      />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="dim-pulse" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
    </filter>
  </defs>
);

export function TawantinsuyuMap({ locations, journeyPath }: Props): JSX.Element {
  const [revealed, setRevealed] = useState<Set<number>>(new Set(FREE_CHAPTERS));
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const { lang, t } = useLanguage();

  useEffect(() => {
    setRevealed(getRevealedChapters());
  }, []);

  function isRevealed(loc: MapLocation): boolean {
    return loc.chapters.some((ch) => revealed.has(ch));
  }

  const currentLocationId = useMemo(() => {
    let maxChapter = -1;
    revealed.forEach((ch) => {
      if (ch > maxChapter) maxChapter = ch;
    });
    const loc = locations.find((l) => l.chapters.includes(maxChapter));
    return loc?.id || null;
  }, [revealed, locations]);

  const discoveredCount = locations.filter((l) => isRevealed(l)).length;

  // Build journey path for revealed locations
  const pathPoints = useMemo(() => {
    const points: { x: number; y: number; revealed: boolean }[] = [];
    const seen = new Set<string>();
    journeyPath.forEach((ch) => {
      const loc = locations.find((l) => l.chapters.includes(ch));
      if (loc && !seen.has(loc.id)) {
        seen.add(loc.id);
        points.push({ x: loc.x, y: loc.y, revealed: isRevealed(loc) });
      }
    });
    return points;
  }, [locations, journeyPath, revealed]);

  function handleLocationClick(loc: MapLocation) {
    if (isRevealed(loc)) {
      setSelectedLocation(selectedLocation === loc.id ? null : loc.id);
    } else {
      setShakeId(loc.id);
      setTimeout(() => setShakeId(null), 500);
    }
  }

  function chapterSlugFromNumber(ch: number): string {
    return ch === 0 ? 'prologue' : `chapter-${String(ch).padStart(2, '0')}`;
  }

  function getDescription(loc: MapLocation): string {
    return lang === 'en' ? loc.descriptionEn : loc.description;
  }

  function getChapterLabel(ch: number): string {
    if (ch === 0) return t('map.prologue');
    return t('map.chapter', { n: ch });
  }

  return (
    <div className="w-full max-w-2xl mx-auto overflow-hidden" data-testid="tawantinsuyu-map">
      {/* Journey distance badge */}
      <div className="text-center mb-4">
        <span
          className="inline-block text-xs text-gold/60 tracking-widest uppercase px-3 py-1 border border-gold/10 rounded-full"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {t('map.journey')}
        </span>
      </div>

      {/* Map container with tocapu-style border */}
      <div
        className="relative rounded-xl overflow-hidden map-border-tocapu"
        style={{
          aspectRatio: '4 / 5',
          background: 'radial-gradient(ellipse at 30% 40%, #1a1008 0%, #0d0905 60%, #080503 100%)',
        }}
      >
        {/* Title overlay */}
        <div
          className="absolute top-3 left-0 right-0 text-center z-[5] pointer-events-none"
          style={{ fontFamily: "'Cinzel Decorative', serif" }}
        >
          <span className="text-gold/40 text-xs md:text-sm tracking-[0.3em]">
            TAWANTINSUYU
          </span>
        </div>

        {/* Compass rose in bottom-right */}
        <div className="absolute bottom-3 right-3 z-[5] pointer-events-none opacity-30">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <line x1="16" y1="2" x2="16" y2="30" stroke="#d4a843" strokeWidth="0.5" />
            <line x1="2" y1="16" x2="30" y2="16" stroke="#d4a843" strokeWidth="0.5" />
            <text x="16" y="6" textAnchor="middle" fill="#d4a843" fontSize="4" fontFamily="'Cinzel', serif">N</text>
            <text x="16" y="30" textAnchor="middle" fill="#d4a843" fontSize="4" fontFamily="'Cinzel', serif">S</text>
            <text x="28" y="17" textAnchor="middle" fill="#d4a843" fontSize="4" fontFamily="'Cinzel', serif">E</text>
            <text x="4" y="17" textAnchor="middle" fill="#d4a843" fontSize="4" fontFamily="'Cinzel', serif">O</text>
          </svg>
        </div>

        {/* SVG map */}
        <svg
          viewBox="-5 -5 110 110"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          aria-label="Map of the Tawantinsuyu"
          data-testid="map-svg"
        >
          {GOLD_GLOW_FILTER}

          {/* Peru country outline */}
          <path
            d={PERU_OUTLINE_PATH}
            fill="rgba(212,168,67,0.02)"
            stroke="rgba(212,168,67,0.12)"
            strokeWidth="0.4"
            strokeLinejoin="round"
          />

          {/* Inner border line -- subtle stepped pattern effect */}
          <path
            d={PERU_OUTLINE_PATH}
            fill="none"
            stroke="rgba(212,168,67,0.05)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeDasharray="2 1.5"
          />

          {/* Journey path segments */}
          {pathPoints.map((point, i) => {
            if (i === 0) return null;
            const prev = pathPoints[i - 1];
            const segRevealed = prev.revealed && point.revealed;
            return (
              <line
                key={`path-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={point.x}
                y2={point.y}
                stroke={segRevealed ? 'rgba(212,168,67,0.4)' : 'rgba(212,168,67,0.08)'}
                strokeWidth={segRevealed ? '0.5' : '0.3'}
                strokeDasharray={segRevealed ? '1.5 0.8' : '0.8 1.2'}
                className={segRevealed ? 'animate-path-draw' : ''}
              />
            );
          })}

          {/* Location markers */}
          {locations.map((loc) => {
            const locRevealed = isRevealed(loc);
            const isCurrent = loc.id === currentLocationId;
            const isSelected = selectedLocation === loc.id;
            const isShaking = shakeId === loc.id;

            return (
              <g
                key={loc.id}
                className={`cursor-pointer ${isShaking ? 'animate-shake' : ''}`}
                onClick={() => handleLocationClick(loc)}
                role="button"
                tabIndex={0}
                aria-label={locRevealed ? `${loc.name} - ${getDescription(loc)}` : t('map.undiscoveredLocation')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLocationClick(loc);
                  }
                }}
                data-testid="map-location-marker"
              >
                {/* Glow for revealed locations */}
                {locRevealed && (
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={isCurrent ? 3 : 2}
                    fill="rgba(212,168,67,0.06)"
                    filter="url(#gold-glow)"
                    className={isCurrent ? 'animate-pulse-slow' : ''}
                  />
                )}

                {/* Animated ring for current location */}
                {isCurrent && (
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={2.8}
                    fill="none"
                    stroke="rgba(212,168,67,0.5)"
                    strokeWidth="0.2"
                    className="animate-pulse-slow"
                  />
                )}

                {/* Marker dot */}
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r={locRevealed ? (isCurrent ? 1.8 : 1.4) : 0.9}
                  fill={locRevealed ? '#d4a843' : 'rgba(120,100,80,0.3)'}
                  stroke={isSelected ? '#f5d16c' : 'none'}
                  strokeWidth={isSelected ? 0.3 : 0}
                  filter={!locRevealed ? 'url(#dim-pulse)' : undefined}
                />

                {/* Invisible expanded hit area for touch (44px equivalent) */}
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r={4}
                  fill="transparent"
                />

                {/* Label for revealed locations */}
                {locRevealed && (
                  <text
                    x={loc.x}
                    y={loc.y + 3.5}
                    textAnchor="middle"
                    fill="rgba(212,168,67,0.65)"
                    fontSize="1.8"
                    fontFamily="'Cinzel', serif"
                  >
                    {loc.nameQuechua}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Info panel for selected location */}
        {selectedLocation && (() => {
          const loc = locations.find((l) => l.id === selectedLocation);
          if (!loc || !isRevealed(loc)) return null;

          // Position panel below the marker, clamped to viewport
          const panelLeft = Math.min(Math.max(loc.x, 20), 80);
          const panelTop = Math.min(loc.y + 5, 70);

          return (
            <div
              className="absolute z-10 bg-[#1a0800]/95 border border-[#d4a843]/25 rounded-lg p-4 max-w-[260px] backdrop-blur-sm"
              style={{
                left: `${panelLeft}%`,
                top: `${panelTop}%`,
                transform: 'translateX(-50%)',
              }}
              data-testid="map-info-panel"
            >
              <h3
                className="text-sm text-[#d4a843] mb-1"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {loc.name}
              </h3>
              <p className="text-xs text-[#d4a843]/50 italic mb-2">
                {loc.nameQuechua}
              </p>
              <p
                className="text-xs text-[rgba(240,230,211,0.7)] mb-3 leading-relaxed"
                style={{ fontFamily: "'Crimson Text', serif" }}
              >
                {getDescription(loc)}
              </p>
              <div className="space-y-1">
                {loc.chapters.filter(ch => ch > 0 || loc.id === 'primordial').map((ch) => (
                  <a
                    key={ch}
                    href={`/listen/${chapterSlugFromNumber(ch)}`}
                    className="block text-xs text-[#d4a843] hover:text-[#f5d16c] transition-colors"
                  >
                    {getChapterLabel(ch)} &rarr;
                  </a>
                ))}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocation(null);
                }}
                className="absolute top-2 right-2 text-[rgba(240,230,211,0.4)] hover:text-[#d4a843] text-xs leading-none w-5 h-5 flex items-center justify-center"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-xs text-[rgba(240,230,211,0.4)]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#d4a843]" />
            {t('map.visited')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[rgba(120,100,80,0.4)]" />
            {t('map.undiscovered')}
          </span>
        </div>
        <span style={{ fontFamily: "'Cinzel', serif" }}>
          {t('map.discovered', { count: discoveredCount, total: locations.length })}
        </span>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        .animate-shake {
          animation: shake 0.15s ease-in-out 3;
        }
        @keyframes path-draw {
          from { stroke-dashoffset: 10; }
          to { stroke-dashoffset: 0; }
        }
        .animate-path-draw {
          stroke-dasharray: 10;
          animation: path-draw 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
