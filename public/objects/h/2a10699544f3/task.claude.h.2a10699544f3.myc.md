---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "artifactdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# task.claude.h.2a10699544f3.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "task.claude.h.2a10699544f3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "d139bebda753aa811ff13baa927f99c880d44f3e60013444bbcebbb2b545f8c7",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.68b7cd17ffc6.task.claude.h.2a10699544f3.myc.md",
    "relation": "intent-projection",
    "target": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
    "raw_hash": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
    "artifact_hash": "68b7cd17ffc637017b93eda61c2951079c609d943863e5594baf13e6f52246da",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
        "input_commitment": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
        "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
        "params_commitment": "10b5e5627187e86a46ee977aab87c4be51699a23959733b06948ff61550c3721"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.task.claude.h.2a10699544f3.myc.md",
    "naming_proof": "naming-proof.claude.h.2a10699544f3.myc.md",
    "oct": "oct:5.1",
    "classification": {
      "kind": "task",
      "actionability": "patch",
      "oct": "oct:5.1",
      "confidence": "medium",
      "signals": [
        "task:add",
        "task:verify"
      ]
    }
  }
}
```
