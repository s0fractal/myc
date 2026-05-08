---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "transformationdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# transform.forward.classify.s0fractal.h.e3b0c44298fc.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.classify.s0fractal.h.e3b0c44298fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "ba7cdc8c54f8aab03b2a034c6f8ff79002db3a8fa3d5c0b10c51b5c4b0f25555",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "classify",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "s0fractal",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.e3b0c44298fc.message.s0fractal.raw.myc.md",
        "commitment": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    ],
    "function": {
      "fqdn": "h.a408768e4531.myc-intent-rules-classifier.function.myc.md",
      "commitment": "a408768e453153efe60928f48958d81c77715de8a6bdd2ebe65bfaf859ac4df3",
      "determinism": "deterministic"
    },
    "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
    "params_commitment": "9f6f214cdaf4722fed14d56381a5db57f648a0f6e8563329ce8d69681f70957a",
    "output": [
      {
        "role": "intent",
        "fqdn": "intent.message.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "1399f1e4213fd56792cff047ae6c7e69785b24ab0c44d4e9d87a0bfa954d57ec"
      }
    ],
    "oct": "oct:3.7",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": [],
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    }
  }
}
```
