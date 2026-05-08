---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "functiondescriptor-generated"
confidence: "medium"
receipt: "file"
---

# h.4c2a6b73a2aa.myc-raw-bytes-sha256.function.myc.md

Deterministic MYC function descriptor.

```json myc
{
  "type": "FunctionDescriptor",
  "schema_version": "myc.function.v0.1",
  "fqdn": "h.4c2a6b73a2aa.myc-raw-bytes-sha256.function.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "4c2a6b73a2aa08b53f6e851c5d54fb367ae3ade2edc9587493e213271890e7df",
    "covers": "descriptor.body"
  },
  "body": {
    "name": "myc.raw.bytes.sha256",
    "version": "0.1.0",
    "kind": "canonicalizer",
    "determinism": "deterministic",
    "rule": "UTF-8 bytes are hashed with SHA-256. No text normalization is applied.",
    "inputs": [
      "input_commitment",
      "context_commitment",
      "params_commitment"
    ],
    "outputs": [
      "artifact_commitment",
      "receipt"
    ],
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    }
  }
}
```
