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

# transform.forward.project.claude.h.2a10699544f3.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.claude.h.2a10699544f3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "fd30181e8d0cbe27dfcfb8b46e7dcb5a1cefa899ec789957652b86049fd919de",
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
        "fqdn": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
        "commitment": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62"
      },
      {
        "role": "intent",
        "fqdn": "intent.task.claude.h.2a10699544f3.myc.md",
        "commitment": "031fd775b2e7f303afbe4e3a6ed42365995be967079150c2f7f7f2b06340455b"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.claude.h.2a10699544f3.myc.md",
        "commitment": "aee50bad7f66fcecb5f84e5e4a367cea6c0b04bec9319aa3e5ab530eb06ca4b4"
      }
    ],
    "function": {
      "fqdn": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
      "determinism": "deterministic"
    },
    "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
    "params_commitment": "10b5e5627187e86a46ee977aab87c4be51699a23959733b06948ff61550c3721",
    "output": [
      {
        "role": "artifact",
        "fqdn": "task.claude.h.2a10699544f3.myc.md",
        "commitment": "d139bebda753aa811ff13baa927f99c880d44f3e60013444bbcebbb2b545f8c7",
        "artifact_hash": "68b7cd17ffc637017b93eda61c2951079c609d943863e5594baf13e6f52246da"
      }
    ],
    "oct": "oct:5.1",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": []
  }
}
```
