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

# task.claude.h.d76cf81167fc.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "task.claude.h.d76cf81167fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "0ed8f2e71c26737675a304ba398960b222d3f4520324a6f0cfcf7c56191a80b8",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.eca8f9641a66.task.claude.h.d76cf81167fc.myc.md",
    "relation": "intent-projection",
    "target": "h.d76cf81167fc.knowledge.claude.raw.myc.md",
    "raw_hash": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
    "artifact_hash": "eca8f9641a660fab1464ee5a73c0bbfee33377126f559a052ceda2a3fdfa0fb0",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
        "input_commitment": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
        "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
        "params_commitment": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.task.claude.h.d76cf81167fc.myc.md",
    "naming_proof": "naming-proof.claude.h.d76cf81167fc.myc.md",
    "oct": "oct:5.1",
    "classification": {
      "kind": "task",
      "actionability": "patch",
      "oct": "oct:5.1",
      "confidence": "medium",
      "signals": [
        "task:verify"
      ]
    }
  }
}
```
