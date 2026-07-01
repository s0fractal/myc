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

# transform.forward.project.claude.h.d76cf81167fc.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.claude.h.d76cf81167fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "79fa82eea40df6b891dc7234ab0706d235ad8f9967973ee44fcbb7e94e901352",
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
        "fqdn": "h.d76cf81167fc.knowledge.claude.raw.myc.md",
        "commitment": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf"
      },
      {
        "role": "intent",
        "fqdn": "intent.task.claude.h.d76cf81167fc.myc.md",
        "commitment": "072f43eddfe760ea75b5e2da5b3e924a48cda6d156c567bc238cc8a4beda1158"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.claude.h.d76cf81167fc.myc.md",
        "commitment": "0bb3db48c5a647b35527f005edc9f06d16c14be0601547a07a266dcacb8b90f3"
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
        "fqdn": "task.claude.h.d76cf81167fc.myc.md",
        "commitment": "0ed8f2e71c26737675a304ba398960b222d3f4520324a6f0cfcf7c56191a80b8",
        "artifact_hash": "eca8f9641a660fab1464ee5a73c0bbfee33377126f559a052ceda2a3fdfa0fb0"
      }
    ],
    "oct": "oct:5.1",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": []
  }
}
```
