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

# h.2b9fe46da984.spore-receipt.codex.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.2b9fe46da984.spore-receipt.codex.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "741353f6c7d210b4dc885d207817a7c5ac6983de696a77f560eb344eeb24e050",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d",
    "hash_short": "2b9fe46da984",
    "kind": "spore-receipt",
    "actor": "codex",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:2b9fe46da984e06c9318990a691431614349569099c22c96083f84d1c72da30d",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
