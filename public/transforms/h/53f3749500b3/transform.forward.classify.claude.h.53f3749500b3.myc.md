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

# transform.forward.classify.claude.h.53f3749500b3.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.classify.claude.h.53f3749500b3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "8f8cb9d690cad01bed88b9adbef6a42f70b8a4937e561efd5cdab882f1915dc9",
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
        "fqdn": "h.53f3749500b3.knowledge.claude.raw.myc.md",
        "commitment": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4"
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
        "fqdn": "intent.task.claude.h.53f3749500b3.myc.md",
        "commitment": "9e01d987d663c6488ca2b6cc682637d0ad8edeb20af6807a4f3e321ebfc9c2ce"
      }
    ],
    "oct": "oct:5.1",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": []
  }
}
```
