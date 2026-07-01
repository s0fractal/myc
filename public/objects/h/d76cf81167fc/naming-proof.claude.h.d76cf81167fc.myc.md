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

# naming-proof.claude.h.d76cf81167fc.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.claude.h.d76cf81167fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "0bb3db48c5a647b35527f005edc9f06d16c14be0601547a07a266dcacb8b90f3",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
        "output": "intent.task.claude.h.d76cf81167fc.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
        "output": "task.claude.h.d76cf81167fc.myc.md"
      }
    ],
    "output": {
      "fqdn": "task.claude.h.d76cf81167fc.myc.md",
      "immutable_fqdn": "h.eca8f9641a66.task.claude.h.d76cf81167fc.myc.md",
      "artifact_hash": "eca8f9641a660fab1464ee5a73c0bbfee33377126f559a052ceda2a3fdfa0fb0"
    }
  }
}
```
