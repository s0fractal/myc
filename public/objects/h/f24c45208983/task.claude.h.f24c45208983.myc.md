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

# task.claude.h.f24c45208983.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "task.claude.h.f24c45208983.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "acfdc17f7458d39cd603bad14912d2905e767119e592d449c43d4c5f3287a1b7",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.192e2cad69a1.task.claude.h.f24c45208983.myc.md",
    "relation": "intent-projection",
    "target": "h.f24c45208983.knowledge.claude.raw.myc.md",
    "raw_hash": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea",
    "artifact_hash": "192e2cad69a1800f3f6dd134170918002628ab5d7604ba3df21b998e66ba4aad",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
        "input_commitment": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea",
        "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
        "params_commitment": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.task.claude.h.f24c45208983.myc.md",
    "naming_proof": "naming-proof.claude.h.f24c45208983.myc.md",
    "oct": "oct:5.1",
    "classification": {
      "kind": "task",
      "actionability": "patch",
      "oct": "oct:5.1",
      "confidence": "medium",
      "signals": [
        "task:write",
        "task:run",
        "task:verify"
      ]
    }
  }
}
```
