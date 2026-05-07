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

# naming-proof.s0fractal.h.38bfd1d80cb9.myc.md

Deterministic proof for the computed human-readable FQDN.

```json myc
{
  "type": "NamingProofDescriptor",
  "schema_version": "myc.naming-proof.v0.1",
  "fqdn": "naming-proof.s0fractal.h.38bfd1d80cb9.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "aaa5b74179cd55129cabe16a46959ad40bfff2bdc72f97f9648969dd5ca7c147",
    "covers": "descriptor.body"
  },
  "body": {
    "input_commitment": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40",
    "proof_mode": "deterministic",
    "oct": "oct:6.4",
    "chain": [
      {
        "step": "canonicalize",
        "function": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
        "params": "none",
        "output": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40"
      },
      {
        "step": "classify",
        "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
        "params": "1ed8379ebae2af2f355680b308fd58302ee347a48db71aa721b25b5e08e496b9",
        "output": "intent.task.s0fractal.h.38bfd1d80cb9.myc.md"
      },
      {
        "step": "render_fqdn",
        "function": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
        "params": "1ed8379ebae2af2f355680b308fd58302ee347a48db71aa721b25b5e08e496b9",
        "output": "task.s0fractal.h.38bfd1d80cb9.myc.md"
      }
    ],
    "output": {
      "fqdn": "task.s0fractal.h.38bfd1d80cb9.myc.md",
      "immutable_fqdn": "h.9640737c8395.task.s0fractal.h.38bfd1d80cb9.myc.md",
      "artifact_hash": "9640737c83958a2103f5358141a45f1835618ff43ac2e4411f7f7e3ba5891a15"
    }
  }
}
```
