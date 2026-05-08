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

# transform.forward.canonicalize.s0fractal.h.e3b0c44298fc.myc.md

First-class transformation edge. This file describes a verified knowledge
transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.canonicalize.s0fractal.h.e3b0c44298fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "2ffe092d596c8e83015a7ac824755fc5384d2807e7f28c0611eff15ea3b650cd",
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
        "commitment": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "payload_state": "private-local"
      }
    ],
    "function": {
      "fqdn": "h.4c2a6b73a2aa.myc-raw-bytes-sha256.function.myc.md",
      "commitment": "4c2a6b73a2aa08b53f6e851c5d54fb367ae3ade2edc9587493e213271890e7df",
      "determinism": "deterministic"
    },
    "context_commitment": "140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe",
    "params_commitment": "140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe",
    "output": [
      {
        "role": "raw",
        "fqdn": "h.e3b0c44298fc.message.s0fractal.raw.myc.md",
        "commitment": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    ],
    "oct": "oct:6.4",
    "note": "Hash raw payload bytes and produce a raw descriptor commitment.",
    "receipts": [],
    "nutrition": {
      "status": "verified",
      "proof_mode": "deterministic"
    }
  }
}
```
