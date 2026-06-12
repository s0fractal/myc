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
  "fqdn": "h.2a10699544f3.publish.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "43c60d62551e4a6c82645ea788d940726f7eaf767a327ef8b6c2d25b8a3ac447",
    "covers": "descriptor.body"
  },
  "body": {
    "publish_clearance": {
      "target_fqdn": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
      "target_commitment": "b482768e6960234ed20bb1eed3c2022bc2a9711036f49239feed9e4d143ecc91",
      "export_scope": "closure"
    },
    "publication_gates": {
      "naming_proof_verified": true,
      "graph_verified": true,
      "payload_scrubbed": true
    },
    "destinations": []
  }
}
```
