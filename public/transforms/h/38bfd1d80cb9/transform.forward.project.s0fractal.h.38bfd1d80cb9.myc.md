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

# transform.forward.project.s0fractal.h.38bfd1d80cb9.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.project.s0fractal.h.38bfd1d80cb9.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "bff6997ea347c6b3c793b7bec6a5e47f01e553e15361e762377c5b42d4f26c84",
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
        "fqdn": "h.38bfd1d80cb9.message.s0fractal.raw.myc.md",
        "commitment": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40"
      },
      {
        "role": "intent",
        "fqdn": "intent.task.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "5af230a0c7934737ced3e3d1ad7809b124bf203187157d00d8e6329967c6f5e6"
      },
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "aaa5b74179cd55129cabe16a46959ad40bfff2bdc72f97f9648969dd5ca7c147"
      }
    ],
    "function": {
      "fqdn": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
      "determinism": "deterministic"
    },
    "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
    "params_commitment": "1ed8379ebae2af2f355680b308fd58302ee347a48db71aa721b25b5e08e496b9",
    "output": [
      {
        "role": "artifact",
        "fqdn": "task.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "103fb1eae6785f1cd4589a6935f6059deb72858545a13bc573c4f96c03764ed4",
        "artifact_hash": "9640737c83958a2103f5358141a45f1835618ff43ac2e4411f7f7e3ba5891a15"
      }
    ],
    "oct": "oct:5.1",
    "note": "Produce the final artifact descriptor from raw, intent, and naming proof.",
    "receipts": []
  }
}
```
