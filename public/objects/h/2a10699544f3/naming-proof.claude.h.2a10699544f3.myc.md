---
chord:
  primary: "oct:6.4"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "namingproofdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# naming-proof.claude.h.2a10699544f3.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.claude.h.2a10699544f3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "aee50bad7f66fcecb5f84e5e4a367cea6c0b04bec9319aa3e5ab530eb06ca4b4",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "10b5e5627187e86a46ee977aab87c4be51699a23959733b06948ff61550c3721",
        "output": "intent.task.claude.h.2a10699544f3.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "10b5e5627187e86a46ee977aab87c4be51699a23959733b06948ff61550c3721",
        "output": "task.claude.h.2a10699544f3.myc.md"
      }
    ],
    "output": {
      "fqdn": "task.claude.h.2a10699544f3.myc.md",
      "immutable_fqdn": "h.68b7cd17ffc6.task.claude.h.2a10699544f3.myc.md",
      "artifact_hash": "68b7cd17ffc637017b93eda61c2951079c609d943863e5594baf13e6f52246da"
    }
  }
}
```
