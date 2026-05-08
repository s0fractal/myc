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

# h.a408768e4531.myc-intent-rules-classifier.function.myc.md

Deterministic MYC function descriptor.

```json myc
{
  "type": "FunctionDescriptor",
  "schema_version": "myc.function.v0.1",
  "fqdn": "h.a408768e4531.myc-intent-rules-classifier.function.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "a408768e453153efe60928f48958d81c77715de8a6bdd2ebe65bfaf859ac4df3",
    "covers": "descriptor.body"
  },
  "body": {
    "name": "myc.intent.rules.classifier",
    "version": "0.1.0",
    "kind": "classifier",
    "determinism": "deterministic",
    "rule": "Rule-based text classifier for task/question/idea/message with conservative Ukrainian and English cues.",
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
