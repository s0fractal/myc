---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "artifactdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# message.codex.h.2b9fe46da984.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "message.codex.h.2b9fe46da984.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "df77e0d7fe0701c7b1e34bf3e9a29a2e87ba3ac234ab06704332d90120252bef",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.2d0b7da628b6.message.codex.h.2b9fe46da984.myc.md",
    "relation": "intent-projection",
    "target": "h.2b9fe46da984.spore-receipt.codex.raw.myc.md",
    "raw_hash": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d",
    "artifact_hash": "2d0b7da628b6b55d3053bb545b8ccb3b78b55684220f5f329dc49a8e55474229",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
        "input_commitment": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d",
        "context_commitment": "f938151ba91dc8a9f915cb86477dc4508681c13d095ae460495b96c86fc0ecb6",
        "params_commitment": "41357886738b500476f5fe18a0188818fc2eab643d2c86889728bc1dd1f94c02"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.message.codex.h.2b9fe46da984.myc.md",
    "naming_proof": "naming-proof.codex.h.2b9fe46da984.myc.md",
    "oct": "oct:3.7",
    "classification": {
      "kind": "message",
      "actionability": "discuss",
      "oct": "oct:3.7",
      "confidence": "low",
      "signals": []
    }
  }
}
```
