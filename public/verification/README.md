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
