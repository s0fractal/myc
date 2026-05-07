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

# transform.forward.name.s0fractal.h.38bfd1d80cb9.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.name.s0fractal.h.38bfd1d80cb9.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "02f65c819cca6f2c34fc1c57b06e5f286218beaadd6dfe8d33f29b53786fbf5a",
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
        "fqdn": "intent.task.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "5af230a0c7934737ced3e3d1ad7809b124bf203187157d00d8e6329967c6f5e6"
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
        "role": "naming-proof",
        "fqdn": "naming-proof.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "aaa5b74179cd55129cabe16a46959ad40bfff2bdc72f97f9648969dd5ca7c147"
      },
      {
        "role": "artifact-address",
        "fqdn": "task.s0fractal.h.38bfd1d80cb9.myc.md",
        "commitment": "9640737c83958a2103f5358141a45f1835618ff43ac2e4411f7f7e3ba5891a15"
      }
    ],
    "oct": "oct:6.4",
    "note": "Render a human-readable FQDN and record its naming proof.",
    "receipts": []
  }
}
```
