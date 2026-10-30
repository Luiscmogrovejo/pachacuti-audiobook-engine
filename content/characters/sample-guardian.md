---
name: "Sample Guardian"
slug: "sample-guardian"
role: "Fixture entry -- demonstrates the character-identity schema"
---
# Sample Guardian -- schema demonstration

**Sample entry.** This file is NOT book content. It shows the shape of a
character record consumed by the image-prompt context system
(`scripts/data/character-identities.ts`). The real character bank is private.

## Visual Identity (LOCKED)

- **Build:** Tall, broad-shouldered adult figure.
- **Skin:** Weathered grey stone with pale mineral veining.
- **Face:** Deep-set eyes; all expression carried by the eyes.
- **Hair:** Dark, uncombed, streaked with grey.
- **Clothing:** Plain coarse-woven tunic, leather belt.
- **NO:** Armour, insignia, modern materials.

## Image Description (what the anchor image shows)

A single figure standing in fitted megalithic stonework, lit from one side by
warm low light. Cool stone greys against warm amber. Oil-painting style with
strong chiaroscuro.

## Prompt Notes

- Identity block is prepended verbatim to every scene prompt (see
  `buildCharacterIdentityPrefix`).
- Style anchor and warm-palette block are appended at generation time.
