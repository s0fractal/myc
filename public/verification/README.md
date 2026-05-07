---
chord:
  primary: "oct:5.1"
  secondary: ["oct:7.2", "oct:6.4"]
energy: 0.67
mode: "OBSERVE"
tension: "graph-verification-layer"
confidence: "medium"
receipt: "file"
---

# Public Verification

`public/verification/` documents generated and executable verification surfaces.

The current executable verifier is:

```bash
deno task myc verify-graph
```

It checks:

- descriptor body commitments
- duplicate canonical descriptor FQDNs
- transformation shape
- function descriptor resolution
- function commitment matching
- input/output FQDN resolution
- input/output commitment alignment with resolved node keys
- `public/graph.ndjson` freshness

This is the first graph-level receipt: not only "does the file hash match", but
"do the transformations actually connect".

Audits:

- `phase-2-pwa-lens.audit.myc.md` records the PWA lens boundary: resolver
  projections are observable, but local paths and private payload bytes are not
  exposed by default.
- `protocol-guardrails.audit.myc.md` records the pre-commit protocol guardrails
  that block premature descriptor families, function identity drift, public
  payload leakage, and secret-like material in public files.
- `phase-3-nutrition.audit.myc.md` records the derived nutrition boundary:
  nutrition can inform summaries, graph warnings, and PWA labels without
  rewriting descriptor identity.
- `adapter-policy.audit.myc.md` records the audited substrate adapter policy
  checkpoint: adapter notes must declare read/write/payload/side-effect
  boundaries before implementation.
