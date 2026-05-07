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

# transform.retrospective.classify.s0fractal.h.38bfd1d80cb9.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.retrospective.classify.s0fractal.h.38bfd1d80cb9.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "d06f8ecb6c19f4f11601e2400a9fb76074a55704a2dc91077d562b3e47b957bc",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "classify",
    "direction": "retrospective",
    "proof_mode": "deterministic",
    "actor": "s0fractal",
    "input": [
      {
        "role": "raw",
        "fqdn": "h.38bfd1d80cb9.message.s0fractal.raw.myc.md",
        "commitment": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40"
      }
    ],
    "function": {
      "fqdn": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "commitment": "340cb8baf52e2dadc024ad00c21a639fbeff0763916138054dc5891d3128ef6d",
      "determinism": "deterministic"
    },
    "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
    "params_commitment": "1ed8379ebae2af2f355680b308fd58302ee347a48db71aa721b25b5e08e496b9",
    "output": [
      {
        "role": "intent",
        "fqdn": "intent.task.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "5af230a0c7934737ced3e3d1ad7809b124bf203187157d00d8e6329967c6f5e6"
      }
    ],
    "oct": "oct:5.1",
    "note": "Classify raw descriptor into a conservative intent projection.",
    "receipts": []
  }
}
```
