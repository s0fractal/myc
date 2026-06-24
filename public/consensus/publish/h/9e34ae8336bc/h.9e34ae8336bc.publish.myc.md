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
  "fqdn": "h.9e34ae8336bc.publish.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "d60d3f6ba22331f1559e6005ac4e52e568b2983707f3ff03fa93115574538d79",
    "covers": "descriptor.body"
  },
  "body": {
    "publish_clearance": {
      "target_fqdn": "h.9e34ae8336bc.proposal.myc.md",
      "target_commitment": "9e34ae8336bc3eae567376d350a1edfb5db92d8569c0407b96da0ea4c6fbb5c4",
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
