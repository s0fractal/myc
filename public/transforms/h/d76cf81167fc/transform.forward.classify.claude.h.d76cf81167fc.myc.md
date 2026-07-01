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

# transform.forward.classify.claude.h.d76cf81167fc.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.classify.claude.h.d76cf81167fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "2d44481de361eb4b959f6c3e65aeab81027979213f546792281308e794261f63",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "classify",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "claude",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.d76cf81167fc.knowledge.claude.raw.myc.md",
        "commitment": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf"
      }
    ],
    "function": {
      "fqdn": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "commitment": "340cb8baf52e2dadc024ad00c21a639fbeff0763916138054dc5891d3128ef6d",
      "determinism": "deterministic"
    },
    "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
    "params_commitment": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
    "output": [
      {
        "role": "intent",
        "fqdn": "intent.task.claude.h.d76cf81167fc.myc.md",
        "commitment": "072f43eddfe760ea75b5e2da5b3e924a48cda6d156c567bc238cc8a4beda1158"
      }
    ],
    "oct": "oct:5.1",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": []
  }
}
```
