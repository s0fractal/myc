---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "artifactdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# message.s0fractal.h.e3b0c44298fc.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "message.s0fractal.h.e3b0c44298fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "867bb36ab8ce419fa74755eb19eb7086840d34d8ace66c42d2b0ecd0fd9b0d5a",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.60a2cbc240cf.message.s0fractal.h.e3b0c44298fc.myc.md",
    "relation": "intent-projection",
    "target": "h.e3b0c44298fc.message.s0fractal.raw.myc.md",
    "raw_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "artifact_hash": "60a2cbc240cf613f85b9544de64b816f6b0d5e0f9418b411d28270fdaefd7ac3",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "cf5e1004e22d96be7209c11334ac49b18aae8b664e2710ef9f4c8ec629678ab1",
        "input_commitment": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
        "params_commitment": "9f6f214cdaf4722fed14d56381a5db57f648a0f6e8563329ce8d69681f70957a"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.message.s0fractal.h.e3b0c44298fc.myc.md",
    "naming_proof": "naming-proof.s0fractal.h.e3b0c44298fc.myc.md",
    "oct": "oct:3.7",
    "classification": {
      "kind": "message",
      "actionability": "discuss",
      "oct": "oct:3.7",
      "confidence": "low",
      "signals": []
    },
    "nutrition": {
      "status": "speculative",
      "proof_mode": "deterministic"
    }
  }
}
```
