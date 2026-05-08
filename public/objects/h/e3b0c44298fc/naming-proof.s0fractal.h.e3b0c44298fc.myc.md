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

# naming-proof.s0fractal.h.e3b0c44298fc.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.s0fractal.h.e3b0c44298fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "d5ce0605a366ba11542adf21686207c3ee633237058c38da5215c4296704ecf8",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    },
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4c2a6b73a2aa.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      {
        "step": "classify",
        "function": "h.a408768e4531.myc-intent-rules-classifier.function.myc.md",
        "params": "9f6f214cdaf4722fed14d56381a5db57f648a0f6e8563329ce8d69681f70957a",
        "output": "intent.message.s0fractal.h.e3b0c44298fc.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.cf5e1004e22d.myc-fqdn-naming-policy.function.myc.md",
        "params": "9f6f214cdaf4722fed14d56381a5db57f648a0f6e8563329ce8d69681f70957a",
        "output": "message.s0fractal.h.e3b0c44298fc.myc.md"
      }
    ],
    "output": {
      "fqdn": "message.s0fractal.h.e3b0c44298fc.myc.md",
      "immutable_fqdn": "h.60a2cbc240cf.message.s0fractal.h.e3b0c44298fc.myc.md",
      "artifact_hash": "60a2cbc240cf613f85b9544de64b816f6b0d5e0f9418b411d28270fdaefd7ac3"
    }
  }
}
```
