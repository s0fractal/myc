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

# task.claude.h.53f3749500b3.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "task.claude.h.53f3749500b3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "012e56180c34f3992dce4a636bb90c20b3fe443d94479cf9545f4317fad24bbf",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.c2afc3b0e16d.task.claude.h.53f3749500b3.myc.md",
    "relation": "intent-projection",
    "target": "h.53f3749500b3.knowledge.claude.raw.myc.md",
    "raw_hash": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4",
    "artifact_hash": "c2afc3b0e16d56d01a5b71347e38eac49ab8912b76a3882b3cd8ae9db2f3b8ed",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
        "input_commitment": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4",
        "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
        "params_commitment": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.task.claude.h.53f3749500b3.myc.md",
    "naming_proof": "naming-proof.claude.h.53f3749500b3.myc.md",
    "oct": "oct:5.1",
    "classification": {
      "kind": "task",
      "actionability": "patch",
      "oct": "oct:5.1",
      "confidence": "medium",
      "signals": [
        "task:fix",
        "task:add",
        "task:run",
        "task:verify"
      ]
    }
  }
}
```
