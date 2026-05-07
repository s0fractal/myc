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

# transform.retrospective.canonicalize.s0fractal.h.38bfd1d80cb9.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.retrospective.canonicalize.s0fractal.h.38bfd1d80cb9.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "03aaa8c2989f301cad1ead70b471205615a1eddc61dd436356b8f2eb958384cd",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "canonicalize",
    "direction": "retrospective",
    "proof_mode": "deterministic",
    "actor": "s0fractal",
    "input": [
      {
        "role": "payload",
        "commitment": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40",
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
        "fqdn": "h.38bfd1d80cb9.message.s0fractal.raw.myc.md",
        "commitment": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40"
      }
    ],
    "oct": "oct:6.4",
    "note": "Hash raw payload bytes and produce a raw descriptor commitment.",
    "receipts": []
  }
}
```
