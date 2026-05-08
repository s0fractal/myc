---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "functiondescriptor-generated"
confidence: "medium"
receipt: "file"
---

# h.cf5e1004e22d.myc-fqdn-naming-policy.function.myc.md

Deterministic MYC function descriptor.

```json myc
{
  "type": "FunctionDescriptor",
  "schema_version": "myc.function.v0.1",
  "fqdn": "h.cf5e1004e22d.myc-fqdn-naming-policy.function.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "cf5e1004e22d96be7209c11334ac49b18aae8b664e2710ef9f4c8ec629678ab1",
    "covers": "descriptor.body"
  },
  "body": {
    "name": "myc.fqdn.naming.policy",
    "version": "0.1.0",
    "kind": "naming-policy",
    "determinism": "deterministic",
    "rule": "Render artifact FQDN as <intent-kind>.<actor>.h.<raw-short>.myc.md using slugged labels.",
    "inputs": [
      "input_commitment",
      "context_commitment",
      "params_commitment"
    ],
    "outputs": [
      "artifact_commitment",
      "receipt"
    ],
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    }
  }
}
```
