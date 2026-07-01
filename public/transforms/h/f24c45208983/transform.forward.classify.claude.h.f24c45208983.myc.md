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

# transform.forward.classify.claude.h.f24c45208983.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.classify.claude.h.f24c45208983.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "9898c46f51f97879742ed91b1107afa3644bc137a720f910744ff75b3dffb5da",
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
        "fqdn": "h.f24c45208983.knowledge.claude.raw.myc.md",
        "commitment": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea"
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
        "fqdn": "intent.task.claude.h.f24c45208983.myc.md",
        "commitment": "8a7d430c5f53c8f6a5ada23f4195c4cd2adba70438940146d4eb2ced9450047c"
      }
    ],
    "oct": "oct:5.1",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": []
  }
}
```
