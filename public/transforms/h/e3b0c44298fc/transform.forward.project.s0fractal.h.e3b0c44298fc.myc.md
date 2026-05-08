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

# transform.forward.project.s0fractal.h.e3b0c44298fc.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.s0fractal.h.e3b0c44298fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "984a5bdc3584890556b4d7c05e78a3ef442b78afaa3232b5a3fb67a2c91a6c81",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "project",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "s0fractal",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.e3b0c44298fc.message.s0fractal.raw.myc.md",
        "commitment": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      {
        "role": "intent",
        "fqdn": "intent.message.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "1399f1e4213fd56792cff047ae6c7e69785b24ab0c44d4e9d87a0bfa954d57ec"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "d5ce0605a366ba11542adf21686207c3ee633237058c38da5215c4296704ecf8"
      }
    ],
    "function": {
      "fqdn": "h.cf5e1004e22d.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "cf5e1004e22d96be7209c11334ac49b18aae8b664e2710ef9f4c8ec629678ab1",
      "determinism": "deterministic"
    },
    "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
    "params_commitment": "9f6f214cdaf4722fed14d56381a5db57f648a0f6e8563329ce8d69681f70957a",
    "output": [
      {
        "role": "artifact",
        "fqdn": "message.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "867bb36ab8ce419fa74755eb19eb7086840d34d8ace66c42d2b0ecd0fd9b0d5a",
        "artifact_hash": "60a2cbc240cf613f85b9544de64b816f6b0d5e0f9418b411d28270fdaefd7ac3"
      }
    ],
    "oct": "oct:3.7",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": [],
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    }
  }
}
```
