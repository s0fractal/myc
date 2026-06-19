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

# transform.forward.classify.codex.h.2b9fe46da984.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.classify.codex.h.2b9fe46da984.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "b1e4c9d42f60f719189b8d14df31a55cbe0b68f5bf084a9dea5c361791b2ee63",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "classify",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "codex",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.2b9fe46da984.spore-receipt.codex.raw.myc.md",
        "commitment": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d"
      }
    ],
    "function": {
      "fqdn": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "commitment": "340cb8baf52e2dadc024ad00c21a639fbeff0763916138054dc5891d3128ef6d",
      "determinism": "deterministic"
    },
    "context_commitment": "f938151ba91dc8a9f915cb86477dc4508681c13d095ae460495b96c86fc0ecb6",
    "params_commitment": "41357886738b500476f5fe18a0188818fc2eab643d2c86889728bc1dd1f94c02",
    "output": [
      {
        "role": "intent",
        "fqdn": "intent.message.codex.h.2b9fe46da984.myc.md",
        "commitment": "52c58518c694cd7a4cd3947f6d10fc6e70f0b693615763cd5302026c5ddf50e8"
      }
    ],
    "oct": "oct:3.7",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": []
  }
}
```
