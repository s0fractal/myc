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

# transform.forward.name.s0fractal.h.f1b9f8142d5f.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.name.s0fractal.h.f1b9f8142d5f.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "a25f97c48c4a7e181a6028f15a427f355fde5283e453235c852d82c7cf74f97c",
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
        "fqdn": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md",
        "commitment": "59b0b010880cd728c539dee69248e93d7077546d3fc5ae6cf5159e55f269c95a"
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
        "role": "naming-proof",
        "fqdn": "naming-proof.s0fractal.h.f1b9f8142d5f.myc.md",
        "commitment": "5c965b969a142c301717ab04d548186463e2bb6e528d3beab82fd199ae30e07d"
      },
      {
        "role": "artifact-address",
        "fqdn": "task.s0fractal.h.f1b9f8142d5f.myc.md",
        "commitment": "fc2538969707b7aa313cbb575564b9b743d783ef77d01afceca4890426d90519"
      }
    ],
    "oct": "oct:6.4",
    "note": "Render a human-readable FQDN and record its naming proof.",
    "receipts": []
  }
}
```
