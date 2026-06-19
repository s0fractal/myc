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

# transform.forward.canonicalize.codex.h.2b9fe46da984.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.canonicalize.codex.h.2b9fe46da984.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "0f810fa9fdb71da8221f5833e23634e64d61a13e5c02df09fd28f6bb9c5f221c",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "canonicalize",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "codex",
    "input": [
      {
        "role": "payload",
        "commitment": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d",
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
        "fqdn": "h.2b9fe46da984.spore-receipt.codex.raw.myc.md",
        "commitment": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d"
      }
    ],
    "oct": "oct:6.4",
    "note": "Hash raw payload bytes and produce a raw descriptor commitment.",
    "receipts": []
  }
}
```
