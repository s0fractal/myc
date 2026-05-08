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

# naming-proof.s0fractal.h.f1b9f8142d5f.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.s0fractal.h.f1b9f8142d5f.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "5c965b969a142c301717ab04d548186463e2bb6e528d3beab82fd199ae30e07d",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "3a7d9c4ef40291ad2c9903adc0dcfb129281c009122643b959bf2ce8a5d267f5",
        "output": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "3a7d9c4ef40291ad2c9903adc0dcfb129281c009122643b959bf2ce8a5d267f5",
        "output": "task.s0fractal.h.f1b9f8142d5f.myc.md"
      }
    ],
    "output": {
      "fqdn": "task.s0fractal.h.f1b9f8142d5f.myc.md",
      "immutable_fqdn": "h.fc2538969707.task.s0fractal.h.f1b9f8142d5f.myc.md",
      "artifact_hash": "fc2538969707b7aa313cbb575564b9b743d783ef77d01afceca4890426d90519"
    }
  }
}
```
