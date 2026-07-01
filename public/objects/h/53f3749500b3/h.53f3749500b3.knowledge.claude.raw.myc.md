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

# h.53f3749500b3.knowledge.claude.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.53f3749500b3.knowledge.claude.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "2b2bcffec079c19f332b612db49731ffa87e0a391b87a09afd4d3e03ab3540b2",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4",
    "hash_short": "53f3749500b3",
    "kind": "knowledge",
    "actor": "claude",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
