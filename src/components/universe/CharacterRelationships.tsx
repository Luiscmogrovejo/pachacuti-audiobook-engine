import React, { useState, type JSX } from 'react';

interface CharacterRelationship {
  characterId: string;
  label: string;
}

interface CharacterDataMinimal {
  id: string;
  slug: string;
  name: string;
  accent: string;
  title: string;
}

interface Props {
  characterId: string;
  relationships: CharacterRelationship[];
  allCharacters: CharacterDataMinimal[];
}

export function CharacterRelationships({ characterId, relationships, allCharacters }: Props): JSX.Element {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!relationships || relationships.length === 0) {
    return <></>;
  }

  return (
    <section>
      <h2
        className="text-lg uppercase tracking-wider pb-2 mb-4 border-b border-[#d4a843]/20"
        style={{ fontFamily: "'Cinzel', serif", color: '#d4a843' }}
      >
        Relaciones
      </h2>
      <div className="flex flex-wrap gap-3">
        {relationships.map((rel) => {
          const related = allCharacters.find(c => c.id === rel.characterId);
          if (!related) return null;

          const isHovered = hoveredId === related.id;
          const initial = related.name.charAt(0);

          return (
            <a
              key={related.id}
              href={`/characters/${related.slug}`}
              className="inline-flex items-center gap-3 rounded-lg p-3 transition-all duration-200"
              style={{
                backgroundColor: 'rgba(58, 42, 26, 0.2)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isHovered
                  ? `${related.accent}80`
                  : 'rgba(212, 168, 67, 0.15)',
              }}
              onMouseEnter={() => setHoveredId(related.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Thumbnail */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(58, 42, 26, 0.8)',
                  color: related.accent,
                }}
              >
                <span
                  className="text-sm font-bold select-none"
                  style={{ fontFamily: "'Cinzel Decorative', serif" }}
                >
                  {initial}
                </span>
              </div>

              {/* Name and label */}
              <div className="min-w-0">
                <span
                  className="block text-sm leading-tight"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: isHovered ? related.accent : '#f0e6d3',
                    transition: 'color 0.2s',
                  }}
                >
                  {related.name}
                </span>
                <span
                  className="block text-xs italic leading-tight mt-0.5"
                  style={{
                    fontFamily: "'Crimson Text', serif",
                    color: 'rgba(240, 230, 211, 0.4)',
                  }}
                >
                  {rel.label}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
