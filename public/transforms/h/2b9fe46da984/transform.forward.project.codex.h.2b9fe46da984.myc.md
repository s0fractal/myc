---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "transformationdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# transform.forward.project.codex.h.2b9fe46da984.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.codex.h.2b9fe46da984.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "961925f3a547087e254a5bb5f3e327fe57d8f621185b744f12fd6cd726b39890",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "project",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "codex",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.2b9fe46da984.spore-receipt.codex.raw.myc.md",
        "commitment": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d"
      },
      {
        "role": "intent",
        "fqdn": "intent.message.codex.h.2b9fe46da984.myc.md",
        "commitment": "52c58518c694cd7a4cd3947f6d10fc6e70f0b693615763cd5302026c5ddf50e8"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.codex.h.2b9fe46da984.myc.md",
        "commitment": "98f45b37b8c4bf2491737b096d183b7d74f593e5834f702c890bc30cd0f0459f"
      }
    ],
    "function": {
      "fqdn": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
      "determinism": "deterministic"
    },
    "context_commitment": "f938151ba91dc8a9f915cb86477dc4508681c13d095ae460495b96c86fc0ecb6",
    "params_commitment": "41357886738b500476f5fe18a0188818fc2eab643d2c86889728bc1dd1f94c02",
    "output": [
      {
        "role": "artifact",
        "fqdn": "message.codex.h.2b9fe46da984.myc.md",
        "commitment": "df77e0d7fe0701c7b1e34bf3e9a29a2e87ba3ac234ab06704332d90120252bef",
        "artifact_hash": "2d0b7da628b6b55d3053bb545b8ccb3b78b55684220f5f329dc49a8e55474229"
      }
    ],
    "oct": "oct:3.7",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": []
  }
}
```
