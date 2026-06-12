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

# transform.forward.classify.claude.h.2a10699544f3.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.classify.claude.h.2a10699544f3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "394e23ecb496ef0257b983e0193a61e8f9cc0e3836521a3f847a3db79eedf67b",
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
        "fqdn": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
        "commitment": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62"
      }
    ],
    "function": {
      "fqdn": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "commitment": "340cb8baf52e2dadc024ad00c21a639fbeff0763916138054dc5891d3128ef6d",
      "determinism": "deterministic"
    },
    "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
    "params_commitment": "10b5e5627187e86a46ee977aab87c4be51699a23959733b06948ff61550c3721",
    "output": [
      {
        "role": "intent",
        "fqdn": "intent.task.claude.h.2a10699544f3.myc.md",
        "commitment": "031fd775b2e7f303afbe4e3a6ed42365995be967079150c2f7f7f2b06340455b"
      }
    ],
    "oct": "oct:5.1",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": []
  }
}
```
