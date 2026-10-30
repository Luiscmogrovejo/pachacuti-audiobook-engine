# Post-Deploy Verification Checklist

A deploy is not done when the rollout succeeds; it is done when these pass.

## Local verification (before touching the cluster)

- [ ] `docker build` succeeds with zero errors
- [ ] Image starts and serves all routes (`/`, `/gallery`, `/settings`, `/map`, `/characters`)
- [ ] `/api/health` returns 200 with JSON status
- [ ] All 7 security headers present (CSP, HSTS, X-Frame-Options,
      X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection)
- [ ] HSTS has a 2-year `max-age` plus `includeSubDomains` and `preload`
- [ ] Playwright E2E suite green against the preview server

## Cluster verification

- [ ] Transfer image: `docker save pachacuti:<tag> | ssh <cluster-node> sudo k3s ctr images import -`
- [ ] Apply manifests: `kubectl apply -k k8s/`
- [ ] Pod reaches Running within 60s
- [ ] Cloudflare Tunnel pod connected (check its logs)
- [ ] `https://<your-host>/` returns 200
- [ ] `/api/health` returns `{"status":"ok","database":"connected"}`
- [ ] Language pill toggles EN/ES on every page
- [ ] `/gallery` lists chapters with thumbnails; lightbox opens
- [ ] `/map` renders the geography with chapter markers
- [ ] `/settings` controls work (speed, font size, clear data)
- [ ] `/characters` renders every registered character
- [ ] `/listen/prologue` plays audio with scene images
- [ ] Mobile at 375px: every page responsive, no horizontal overflow
- [ ] Audio streaming works (signed tokens, HTTP range requests)
- [ ] Auth flow works (magic-link gate on the signup tier)
- [ ] Volume mounts: audio and art directories readable inside the pod

## Deploy command

```bash
CLUSTER_NODE=<cluster-node-host> ./scripts/deploy-k3s.sh <tag>
```

## Rollback

```bash
kubectl -n pachacuti set image deploy/pachacuti app=registry.example:5000/pachacuti:<previous-tag>
kubectl -n pachacuti rollout status deploy/pachacuti --timeout=120s
```

## Asset volume notes

- Audio and art are NOT baked into the image; they are volume-mounted via a PVC
  and `subPath` mounts onto `/app/dist/client/audio` and `/app/dist/client/art`.
- Size the PVC for the full media set before the first deploy; resizing a
  ReadWriteOnce volume means taking the pod down.
