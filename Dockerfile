# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# sharp native deps on Alpine
RUN apk add --no-cache python3 make g++

# Dependency caching: package files first
COPY package.json package-lock.json ./
RUN npm ci

# Source files (audio/art excluded by .dockerignore)
COPY . .

# Build Astro SSR output
RUN npm run build

# ── Stage 2: Prune ─────────────────────────────────────────────
# Install only the packages the SSR server actually imports at runtime.
# Astro standalone mode bundles most code into dist/server/entry.mjs,
# but some packages are externalized and must be in node_modules.
FROM node:22-alpine AS pruner

WORKDIR /app

# Create minimal runtime package.json with only actual runtime deps
# (discovered by tracing imports in dist/server/chunks/*.mjs)
RUN echo '{ \
  "name": "pachacuti-runtime", \
  "type": "module", \
  "private": true, \
  "dependencies": { \
    "@oslojs/encoding": "^1.1.0", \
    "better-auth": "^1.5.6", \
    "clsx": "^2.1.1", \
    "cookie": "^1.0.2", \
    "devalue": "^5.1.1", \
    "drizzle-orm": "^0.45.2", \
    "es-module-lexer": "^1.6.0", \
    "html-escaper": "^3.0.3", \
    "jose": "^6.2.2", \
    "mrmime": "^2.0.1", \
    "piccolore": "^0.1.0", \
    "postgres": "^3.4.8", \
    "react": "^19.2.4", \
    "react-dom": "^19.2.4", \
    "resend": "^6.9.4", \
    "send": "^1.2.0", \
    "server-destroy": "^1.0.1", \
    "unstorage": "^1.15.0", \
    "zod": "^3.25.20", \
    "zustand": "^5.0.12" \
  } \
}' > package.json

RUN npm install --omit=dev --no-package-lock 2>/dev/null

# ── Stage 3: Runtime ───────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL maintainer="pachacuti"
LABEL org.opencontainers.image.description="Pachacuti Audiobook - Astro SSR"

WORKDIR /app

# Non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copy built output from builder, pruned node_modules from pruner
COPY --from=builder /app/dist ./dist
COPY --from=pruner /app/node_modules ./node_modules

# Audio and art directories -- volume-mounted by k8s
# Create empty mount points so Astro does not error on missing dirs
RUN mkdir -p /app/dist/client/audio/chapters \
             /app/dist/client/audio/timing \
             /app/dist/client/art && \
    chown -R appuser:appgroup /app

USER appuser

# Astro standalone server config
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4321/ || exit 1

CMD ["node", "dist/server/entry.mjs"]
