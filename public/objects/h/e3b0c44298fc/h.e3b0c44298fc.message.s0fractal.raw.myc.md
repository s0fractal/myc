---
chord:
  primary: "oct:6.4"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "rawdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# h.e3b0c44298fc.message.s0fractal.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.e3b0c44298fc.message.s0fractal.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "84750cace99a496923f0191ffca10bafd5e13224151dab9f6e5845e05db26992",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "hash_short": "e3b0c44298fc",
    "kind": "message",
    "actor": "s0fractal",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "nutrition": {
      "status": "raw",
      "proof_mode": "sealed"
    },
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
