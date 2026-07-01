---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "transformationdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# transform.forward.project.claude.h.53f3749500b3.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.claude.h.53f3749500b3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "888588c87ac7de3c2e0b2bc86f5e35a1979d9e6e3788ff5a8d075c6579b6f7de",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "project",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "claude",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.53f3749500b3.knowledge.claude.raw.myc.md",
        "commitment": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4"
      },
      {
        "role": "intent",
        "fqdn": "intent.task.claude.h.53f3749500b3.myc.md",
        "commitment": "9e01d987d663c6488ca2b6cc682637d0ad8edeb20af6807a4f3e321ebfc9c2ce"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.claude.h.53f3749500b3.myc.md",
        "commitment": "28728e9c48e2cf8e357ac08a61f82e7696c86437aa4786b33a134912f8fac554"
      }
    ],
    "function": {
      "fqdn": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
      "determinism": "deterministic"
    },
    "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
    "params_commitment": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
    "output": [
      {
        "role": "artifact",
        "fqdn": "task.claude.h.53f3749500b3.myc.md",
        "commitment": "012e56180c34f3992dce4a636bb90c20b3fe443d94479cf9545f4317fad24bbf",
        "artifact_hash": "c2afc3b0e16d56d01a5b71347e38eac49ab8912b76a3882b3cd8ae9db2f3b8ed"
      }
    ],
    "oct": "oct:5.1",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": []
  }
}
```
