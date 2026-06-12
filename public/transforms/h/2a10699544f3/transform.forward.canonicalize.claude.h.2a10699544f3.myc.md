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

# transform.forward.canonicalize.claude.h.2a10699544f3.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.canonicalize.claude.h.2a10699544f3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "ceeb1e85b93310ca8dad7478f0f1402eceb57274f126dabada8237c47ec0dd70",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "canonicalize",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "claude",
    "input": [
      {
        "role": "payload",
        "commitment": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
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
        "fqdn": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
        "commitment": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62"
      }
    ],
    "oct": "oct:6.4",
    "note": "Hash raw payload bytes and produce a raw descriptor commitment.",
    "receipts": []
  }
}
```
