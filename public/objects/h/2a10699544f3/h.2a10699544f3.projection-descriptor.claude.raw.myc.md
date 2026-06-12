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

# h.2a10699544f3.projection-descriptor.claude.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "b482768e6960234ed20bb1eed3c2022bc2a9711036f49239feed9e4d143ecc91",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
    "hash_short": "2a10699544f3",
    "kind": "projection-descriptor",
    "actor": "claude",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
