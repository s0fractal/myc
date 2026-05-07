---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7", "oct:5.1"]
energy: 0.71
mode: "OBSERVE"
tension: "naming-proof-schema"
confidence: "medium"
receipt: "file"
---

# Naming Proof Schema

```yaml
naming_proof:
  input_commitment: "h.raw-or-target"
  proof_mode: "deterministic | witnessed"

  chain:
    - step: "canonicalize"
      function: "h.canonicalizer"
      params: "h.params-or-null"
      output: "h.canonical"
    - step: "classify"
      function: "h.classifier"
      params: "h.params-or-null"
      output: "h.classification"
    - step: "render_fqdn"
      function: "h.naming-policy"
      params: "h.params-or-null"
      output: "review.codex.h.<target>.jazz.protocol.myc.md"

  output:
    fqdn: "review.codex.h.<target>.jazz.protocol.myc.md"
    artifact_hash: "h.final"

  receipts:
    - kind: "command | file | test | witness | signature | ledger"
      hash: "h.receipt"
```

## Rule

The name is produced after capture. A human may propose a name, but a protocol
artifact should record the naming policy that accepted or changed it.
