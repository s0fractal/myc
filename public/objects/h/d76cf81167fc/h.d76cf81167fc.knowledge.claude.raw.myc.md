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

# h.d76cf81167fc.knowledge.claude.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.d76cf81167fc.knowledge.claude.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "65cc894880d9ca798114b62802483262c3fe401698151ae852dd836ae7807100",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
    "hash_short": "d76cf81167fc",
    "kind": "knowledge",
    "actor": "claude",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
