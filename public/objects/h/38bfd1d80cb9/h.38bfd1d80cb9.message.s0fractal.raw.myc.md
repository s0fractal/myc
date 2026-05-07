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

# h.38bfd1d80cb9.message.s0fractal.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.38bfd1d80cb9.message.s0fractal.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "f8aca4551d56acf16279f47b7c49c976167b17a4105ce66606c570fbc935cb38",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40",
    "hash_short": "38bfd1d80cb9",
    "kind": "message",
    "actor": "s0fractal",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:38bfd1d80cb91b6cf2e442d21053e2638612f9c26d1e186c6fc7fa122773eb40",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
