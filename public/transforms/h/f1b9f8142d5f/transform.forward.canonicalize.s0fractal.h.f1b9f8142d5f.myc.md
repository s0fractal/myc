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

# transform.forward.canonicalize.s0fractal.h.f1b9f8142d5f.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.canonicalize.s0fractal.h.f1b9f8142d5f.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "13931fa130c4d67bf520ad0256ef36cf7d9159edd63d4fa279121b61aed96aad",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "canonicalize",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "s0fractal",
    "input": [
      {
        "role": "payload",
        "commitment": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
        "payload_state": "private-local"
      }
    ],
    "function": {
      "fqdn": "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
      "commitment": "4f76fd8466bc993d2bf033bebcc9cf9481e863a16f43f0a6c9db4862ac8aa8d1",
      "determinism": "deterministic"
    },
    "context_commitment": "140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe",
    "params_commitment": "140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe",
    "output": [
      {
        "role": "raw",
        "fqdn": "h.f1b9f8142d5f.plan.s0fractal.raw.myc.md",
        "commitment": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f"
      }
    ],
    "oct": "oct:6.4",
    "note": "Hash raw payload bytes and produce a raw descriptor commitment.",
    "receipts": []
  }
}
```
