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

# naming-proof.claude.h.f24c45208983.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.claude.h.f24c45208983.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "05ec81a52b7bb93545867f26038b52d47e9c314beeb45a29bc42178487e7274c",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
        "output": "intent.task.claude.h.f24c45208983.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
        "output": "task.claude.h.f24c45208983.myc.md"
      }
    ],
    "output": {
      "fqdn": "task.claude.h.f24c45208983.myc.md",
      "immutable_fqdn": "h.192e2cad69a1.task.claude.h.f24c45208983.myc.md",
      "artifact_hash": "192e2cad69a1800f3f6dd134170918002628ab5d7604ba3df21b998e66ba4aad"
    }
  }
}
```
