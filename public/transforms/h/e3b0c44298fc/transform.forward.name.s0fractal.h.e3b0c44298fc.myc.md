---
chord:
  primary: "oct:6.4"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "transformationdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# transform.forward.name.s0fractal.h.e3b0c44298fc.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.name.s0fractal.h.e3b0c44298fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "4378bdee1ab841dfc6aaca5b932b9d3806a64b24cb850c611a34f5698148028e",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "name",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "s0fractal",
    "input": [
      {
        "role": "intent",
        "fqdn": "intent.message.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "1399f1e4213fd56792cff047ae6c7e69785b24ab0c44d4e9d87a0bfa954d57ec"
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
        "role": "naming-proof",
        "fqdn": "naming-proof.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "d5ce0605a366ba11542adf21686207c3ee633237058c38da5215c4296704ecf8"
      },
      {
        "role": "artifact-address",
        "fqdn": "message.s0fractal.h.e3b0c44298fc.myc.md",
        "commitment": "60a2cbc240cf613f85b9544de64b816f6b0d5e0f9418b411d28270fdaefd7ac3"
      }
    ],
    "oct": "oct:6.4",
    "note": "Render a human-readable FQDN and record its naming proof.",
    "receipts": [],
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    }
  }
}
```
