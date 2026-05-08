---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "transformationdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# transform.forward.project.s0fractal.h.f1b9f8142d5f.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.s0fractal.h.f1b9f8142d5f.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "294bb74019d216057724b1cd3fa5afa441a94c17b6f2d1048ec084e4d0bdcdd1",
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
        "fqdn": "h.f1b9f8142d5f.plan.s0fractal.raw.myc.md",
        "commitment": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f"
      },
      {
        "role": "intent",
        "fqdn": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md",
        "commitment": "59b0b010880cd728c539dee69248e93d7077546d3fc5ae6cf5159e55f269c95a"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.s0fractal.h.f1b9f8142d5f.myc.md",
        "commitment": "5c965b969a142c301717ab04d548186463e2bb6e528d3beab82fd199ae30e07d"
      }
    ],
    "function": {
      "fqdn": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
      "determinism": "deterministic"
    },
    "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
    "params_commitment": "3a7d9c4ef40291ad2c9903adc0dcfb129281c009122643b959bf2ce8a5d267f5",
    "output": [
      {
        "role": "artifact",
        "fqdn": "task.s0fractal.h.f1b9f8142d5f.myc.md",
        "commitment": "67342db2b6b28385f62a4a6e033257cf4ee3f3813a05dbca77666e921b2066d1",
        "artifact_hash": "fc2538969707b7aa313cbb575564b9b743d783ef77d01afceca4890426d90519"
      }
    ],
    "oct": "oct:5.1",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": []
  }
}
```
