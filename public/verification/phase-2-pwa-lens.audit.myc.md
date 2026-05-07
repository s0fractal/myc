---
chord:
  primary: "oct:5.1"
  secondary: ["oct:7.2", "oct:6.4", "oct:3.7"]
energy: 0.76
mode: "VERIFY"
tension: "phase-2-pwa-lens-boundary-audit"
confidence: "high"
receipt: "file"
---

# Phase 2 PWA Lens Boundary Audit

Commit under audit:

```text
3bf49c8e2975caa1a75b01c8696ac63b0a1e9321
```

## Claim

The PWA is a lens over the local resolver. It is not a source of truth and it
does not receive private payload bytes by default.

## Verified Boundaries

- Resolver health exposes service/version/root state, not local root path.
- `/index` omits local filesystem paths unless `?paths=1` is explicitly used.
- `/graph` omits local transform paths unless `?paths=1` is explicitly used.
- `/source` returns descriptor markdown source, not private payload bytes.
- Audit receipts log method/path/status/duration and omit query strings.
- PWA offline cache stores last public projection of index/graph state, not raw
  private payload.
- PWA graph/list navigation resolves through resolver endpoints.

## Executable Receipts

```bash
deno task check
deno task myc verify-graph
```

Current checked surface:

- 17 tests pass.
- Graph verification has zero errors.
- Graph verification has zero warnings.

## Remaining Phase 2 Risk

- The PWA has simple canvas graph layout only; dense graphs will need filtering.
- Offline cache is browser-local projection state; it must never become
  canonical.
- Service worker caches shell assets only, not resolver payload responses.

## Next Gate

Phase 3 can begin only after this remains true:

```text
PWA observes descriptors and transformations; it does not mint protocol truth.
```
