---
chord:
  primary: "oct:7.2"
  secondary: ["oct:6.4"]
energy: 0.85
mode: "OBSERVE"
tension: "publish-descriptor-schema"
confidence: "high"
receipt: "file"
---

# Publish Descriptor Schema

A Publish Descriptor marks an object or subgraph as cleared for public export.

```yaml
publish_clearance:
  target_fqdn: "h.<hash>.artifact.myc.md"
  target_commitment: "hash"
  export_scope: "single | closure | subgraph"

publication_gates:
  naming_proof_verified: true
  graph_verified: true
  payload_scrubbed: true

destinations:
  - protocol: "ipfs"
    address: "ipfs://..."
  - protocol: "http"
    address: "https://..."

signatures:
  - "h.receipt.myc.md"
```

## Export Scope

- `single`: Only the specified target descriptor is published.
- `closure`: The target and all its causal dependencies (inputs, functions,
  contexts) are published.
- `subgraph`: The target and a specific set of bounded edges are published.
