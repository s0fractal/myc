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

# h.f24c45208983.knowledge.claude.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.f24c45208983.knowledge.claude.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "ed013574f7ef7639643b68ff3fec70287e195cd4b2e753eb425757c0508350f6",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea",
    "hash_short": "f24c45208983",
    "kind": "knowledge",
    "actor": "claude",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
