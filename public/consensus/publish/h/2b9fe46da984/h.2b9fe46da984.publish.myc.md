---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "publishdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# Publish Descriptor

Publication clearance for the target closure; witnessable consensus node.

```json myc
{
  "type": "PublishDescriptor",
  "schema_version": "myc.publish.v0.1",
  "fqdn": "h.2b9fe46da984.publish.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "648b6dfcc99d83fe7ca54e623a2accd8a410ae9357835071f8e271d2e87d4372",
    "covers": "descriptor.body"
  },
  "body": {
    "publish_clearance": {
      "target_fqdn": "h.2b9fe46da984.spore-receipt.codex.raw.myc.md",
      "target_commitment": "741353f6c7d210b4dc885d207817a7c5ac6983de696a77f560eb344eeb24e050",
      "export_scope": "closure"
    },
    "publication_gates": {
      "naming_proof_verified": true,
      "graph_verified": true,
      "payload_scrubbed": true
    },
    "destinations": [],
    "derived_from": "14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688"
  }
}
```
