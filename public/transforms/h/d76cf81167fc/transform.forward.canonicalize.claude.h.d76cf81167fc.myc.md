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

# transform.forward.canonicalize.claude.h.d76cf81167fc.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.canonicalize.claude.h.d76cf81167fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "99b935fc3a3a631540a22cd118d3b854e816919e0cec496d1ef8202dba003df3",
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
        "commitment": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
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
        "fqdn": "h.d76cf81167fc.knowledge.claude.raw.myc.md",
        "commitment": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf"
      }
    ],
    "oct": "oct:6.4",
    "note": "Hash raw payload bytes and produce a raw descriptor commitment.",
    "receipts": []
  }
}
```
