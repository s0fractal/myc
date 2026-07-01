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

# naming-proof.claude.h.53f3749500b3.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.claude.h.53f3749500b3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "28728e9c48e2cf8e357ac08a61f82e7696c86437aa4786b33a134912f8fac554",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
        "output": "intent.task.claude.h.53f3749500b3.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
        "output": "task.claude.h.53f3749500b3.myc.md"
      }
    ],
    "output": {
      "fqdn": "task.claude.h.53f3749500b3.myc.md",
      "immutable_fqdn": "h.c2afc3b0e16d.task.claude.h.53f3749500b3.myc.md",
      "artifact_hash": "c2afc3b0e16d56d01a5b71347e38eac49ab8912b76a3882b3cd8ae9db2f3b8ed"
    }
  }
}
```
