---
chord:
  primary: "oct:6.4"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "namingproofdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# naming-proof.codex.h.2b9fe46da984.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.codex.h.2b9fe46da984.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "98f45b37b8c4bf2491737b096d183b7d74f593e5834f702c890bc30cd0f0459f",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "41357886738b500476f5fe18a0188818fc2eab643d2c86889728bc1dd1f94c02",
        "output": "intent.message.codex.h.2b9fe46da984.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "41357886738b500476f5fe18a0188818fc2eab643d2c86889728bc1dd1f94c02",
        "output": "message.codex.h.2b9fe46da984.myc.md"
      }
    ],
    "output": {
      "fqdn": "message.codex.h.2b9fe46da984.myc.md",
      "immutable_fqdn": "h.2d0b7da628b6.message.codex.h.2b9fe46da984.myc.md",
      "artifact_hash": "2d0b7da628b6b55d3053bb545b8ccb3b78b55684220f5f329dc49a8e55474229"
    }
  }
}
```
