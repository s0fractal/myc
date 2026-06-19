---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "witnessdescriptor-generated"
confidence: "medium"
receipt: "file"
content_sig:
  voice: codex
  alg: ed25519
  covers: "commitment"
  sig: "rpy9Nezw7XJWqYe6GRPrutfbGt0L7mjgvNxLcBNZUw4Qvs3unDQRfI5EgAnsMRKg7FJ0pGw7OHssS2JrfcN5Aw=="
---

# Witness Descriptor

Generated locally to prove receipt and structural validity.

```json myc
{
  "type": "WitnessDescriptor",
  "schema_version": "myc.witness.v0.1",
  "fqdn": "h.9942f4cdc158.witness.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "9942f4cdc1585d5f0aed0b3d4ce671ca036fb9627bc0ef57313959d8227921ed",
    "covers": "descriptor.body"
  },
  "body": {
    "target_fqdn": "h.2b9fe46da984.publish.myc.md",
    "target_commitment": "648b6dfcc99d83fe7ca54e623a2accd8a410ae9357835071f8e271d2e87d4372",
    "witness_actor": "codex",
    "timestamp": "2026-06-19T09:18:09.920Z",
    "verification_status": "structurally_valid"
  }
}
```
