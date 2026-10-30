# Pachacuti — Audiobook Web Experience

A bilingual (Spanish/English) web audiobook player and companion site, built as an
Astro SSR application. Readers pick a chapter, the narration streams behind a
signed short-lived token, and the text highlights sentence by sentence in sync
with the audio.

**Live:** https://pachacuti.robertamauta.com

> ## The book itself is not in this repository
>
> This is the **engine**, published so the engineering can be read. The novel it
> serves is unpublished, copyrighted work and is deliberately **not included**:
> no chapter text, no narration audio, no generated artwork, no full glossary,
> character bank or scene-prompt bank.
>
> - **Code** (everything in `src/`, `scripts/`, `k8s/`, `tests/`, config): MIT —
>   see [LICENSE](LICENSE).
> - **Content** (the novel, its translations, the narration, the artwork, the
>   character and scene banks, whether or not any of it appears here):
>   **© Luis Mogrovejo — All Rights Reserved.** Not licensed under MIT, and not
>   granted for reuse, training, or redistribution.
>
> What ships instead are small fixtures, clearly marked as samples, so the app
> builds and runs: a one-paragraph public-domain (CC0) sample chapter in each
> language, matching sample timing JSON, a 5-term pronunciation lexicon, 2 of 32
> character records, 12 of 186 glossary terms, 3 of 120 quiz questions, 3 of 153
> scene rows, and 2 of ~230 scene prompts. Pages that depend on media you do not
> have degrade to empty states rather than failing.

---

## What is interesting in here

### Narration pipeline (`scripts/generate-audiobook-v3.mjs`)

Azure AI Speech synthesis driven by generated SSML, not by raw text:

- **SSML builder** (`buildSSML`) wraps each chunk in `<voice>` / `<prosody>` and
  attaches a **PLS custom lexicon** by URI, so Quechua proper nouns are spoken
  from IPA instead of being guessed by the English or Spanish voice.
- **PLS lexicon generator** (`scripts/build-quechua-lexicon.ts`) walks the source
  text, extracts Quechua graphemes, and emits a W3C Pronunciation Lexicon
  Specification XML file per locale (grapheme → IPA, with a stress-rule engine
  and an override table). `scripts/audit-ipa.ts` checks the output.
  A 5-term sample of the generated output is committed under
  `public/audio/lexicon/`.
- **Timing capture**: the synthesizer's `wordBoundary` events are collected,
  cleaned of three known Azure artifact classes (`cleanTimingWords`), then
  folded back into sentence spans (`deriveSentencesFromWords`) with bounded
  lookahead, because sentence boundaries from the SDK alone do not survive
  Quechua punctuation.
- Chunking at 5,000 characters per request with inter-request delay, since the
  service caps roughly 10 minutes of audio per synthesis call.

### Playback sync (`src/lib/data/timing.ts`, `src/components/player/`)

Sentence timings load as JSON per chapter/language/voice; the active sentence is
found by binary search on playback time, with an explicit "in a gap" result
rather than a nearest-neighbour guess. The player is an HTML5 `<audio>` element
(not Web Audio) so iOS lock-screen controls and Media Session work, with a
three-slot karaoke display, sleep timer, bookmarks, speed control, a persistent
mini-player, and a scene-image cycler keyed off the same clock.

### Image-prompt context system (`scripts/data/`, `scripts/generate-scenes.ts`)

Generated artwork drifts; this is the structure used to stop it:

- `style-anchor.ts` — one immutable style block plus a warm-palette block,
  appended to **every** prompt.
- `arch-bank.ts` — a location bank keyed by id, positive-description-only
  (negations leak into diffusion output), each entry ending on a lighting cue.
- `character-identities.ts` — a locked per-character identity block, prepended
  verbatim to every prompt that features them, concatenated with an explicit
  separator for multi-character shots so attributes stay attached to subjects.
- `scene-prompts.ts` — scene rows that compose the three into
  `STYLE_ANCHOR + ARCH[key] + description`.

The banks here are samples; the schema and the composition code are complete.

### Content protection

- **AES-256-GCM** chunked encryption of text, audio and images
  (`src/lib/crypto/`, `scripts/encrypt-*.ts`): a 32-byte master key from the
  environment, **HKDF-SHA256** session-scoped key derivation, a 96-bit IV per
  chunk, and the ciphertext written as `[ciphertext][authTag]` so
  `SubtleCrypto.decrypt({name:"AES-GCM"})` can read it directly in the browser.
  A SHA-256 of the plaintext travels in the manifest for integrity checking.
- **Signed audio tokens** (`src/lib/audio/token.ts`): JWTs with a 5-minute
  expiry; the stream endpoint accepts the token, not a file path.
- **Three-tier enforcement** (`src/lib/data/chapters.ts` + the API routes): free
  chapters are open, signup chapters require a session (401), paid chapters
  require an entitlement (402). Enforced server-side per request, not in the UI.
- Per-IP rate limiting, path-traversal checks on every filesystem read, and a
  security-header pass in `src/middleware.ts`.

### AI disclosure

The narration is synthetic speech (Azure AI Speech), and the site's artwork is
generated with diffusion models driven by the prompt system above. The prose is
written by the author. There is no AI-disclosure page in this repository; the
disclosure lives on the live site.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 6 (`output: 'server'`, `@astrojs/node` standalone) |
| UI islands | React 19 (player, gallery, quiz, settings) |
| Styling | Tailwind 4 via `@tailwindcss/vite` (CSS-first, no config file) |
| Auth | Better Auth 1.5 — magic link over Resend, Cloudflare Turnstile |
| Database | PostgreSQL via Drizzle ORM (6 tables, 1 migration) |
| Payments | Stripe Checkout + webhook |
| Speech | `microsoft-cognitiveservices-speech-sdk` |
| Images | `sharp` (AVIF primary, WebP fallback) |
| Tests | Playwright (19 spec files, 251 tests, run on 2 device projects) |
| Deploy | Docker multi-stage → Kubernetes (k3s) behind a Cloudflare Tunnel |

## Architecture

```
Browser
  │  HTML (SSR per request, language resolved server-side)
  ▼
Astro SSR (Node standalone, :4321)
  ├── 12 pages          /, /listen/[chapter], /gallery, /map, /characters/[slug],
  │                     /glossary, /quiz, /settings, /payment, /auth/signin, ...
  ├── 19 API routes     /api/audio/{token,stream,manifest,encrypted}
  │                     /api/text/[chapter]   (tier-gated, 401 / 402)
  │                     /api/crypto/session-key, /api/image/[...path]
  │                     /api/progress/{save,load}, /api/bookmarks/*
  │                     /api/auth/*, /api/payment/{create-session,webhook}
  │                     /api/health
  ├── middleware        security headers + per-route rate-limit buckets
  ├── Better Auth ──────► PostgreSQL (user, session, account, verification,
  │                                    reading_progress, bookmark)
  └── reads media ──────► PVC-mounted volume (narration MP3s, timing JSON, art)

Offline pipelines (not in the request path)
  chapters ──► build-quechua-lexicon ──► PLS XML ──┐
  chapters ──► generate-audiobook-v3 ◄─────────────┘ ──► MP3 + word/sentence timings
  prompts  ──► generate-scenes ──► scene art
  all media ─► encrypt-{content,audio,images} ──► AES-256-GCM manifests
```

## Running it locally

Needs Node 22+ and a PostgreSQL database. Nothing here needs a real Azure,
Stripe or Resend key to **build**; those are only exercised by the pipelines and
the paid/auth flows.

```bash
cp .env.example .env          # placeholders are enough for a build
npm ci
npm run build                 # Astro SSR build
npm run preview               # serves the built app on :4321
```

```bash
npm run dev                   # dev server
npm run check                 # astro check (TypeScript, strict)
npm test                      # Playwright, boots `npm run preview` itself
npm run test:mobile           # Pixel 5 project only
```

Database, when you want auth and progress to work:

```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/pachacuti
npm run db:generate           # drizzle-kit generate
npm run db:migrate            # apply migrations
```

Pipelines (each needs its own credentials and source content):

```bash
npx tsx scripts/build-quechua-lexicon.ts        # PLS lexicon from source text
node scripts/generate-audiobook-v3.mjs --dry-run
npx tsx scripts/generate-scenes.ts              # scene art
npm run encrypt:all                             # AES-256-GCM manifests
npm run validate-assets                         # inventory + gap report
```

## Deploying

```bash
docker build -t pachacuti:<tag> .
# fill in k8s/secrets.yaml (every value is CHANGE_ME in the template)
CLUSTER_NODE=<cluster-node-host> ./scripts/deploy-k3s.sh <tag>
```

`k8s/` holds a namespace with a resource quota, the deployment (non-root, secrets
by reference only), a ClusterIP service, a PVC for media, a one-shot Drizzle
migration job, and a Cloudflare Tunnel deployment. Media is never baked into the
image — it is volume-mounted onto `dist/client/{audio,art}`.
`scripts/post-deploy-checklist.md` is the verification list.

## Repository layout

```
src/
  pages/              12 pages + 19 API routes
  components/player/  React audio player island (engine, karaoke, bookmarks, …)
  components/universe/ gallery, glossary, quiz, map, character cards
  lib/crypto/         AES-256-GCM + HKDF, server and client halves
  lib/data/           chapters/tiers, timing sync, glossary, quiz, map, themes
  lib/auth, lib/db, lib/payment, lib/i18n
  middleware.ts       security headers + rate limiting
scripts/
  generate-audiobook-v3.mjs   SSML + Azure synthesis + timing capture
  build-quechua-lexicon.ts    PLS lexicon generator;  audit-ipa.ts validates it
  generate-scenes.ts          scene art generation
  encrypt-*.ts                content encryption;  verify-encryption.ts checks it
  data/                       style anchor, location bank, character identities
tests/e2e/            19 Playwright specs
k8s/                  manifests (templates — secrets are all CHANGE_ME)
content/, public/     sample fixtures only (see the notice above)
```

## Security

See [SECURITY.md](SECURITY.md).
