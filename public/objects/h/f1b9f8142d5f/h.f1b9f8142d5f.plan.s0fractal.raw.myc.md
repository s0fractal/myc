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

# h.f1b9f8142d5f.plan.s0fractal.raw.myc.md

Raw commitment descriptor. Payload bytes are not embedded here.

```json myc
{
  "type": "RawDescriptor",
  "schema_version": "myc.raw.v0.1",
  "fqdn": "h.f1b9f8142d5f.plan.s0fractal.raw.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "7f86113cc4e924b558ac16baeaf547bf0c95a0bc51f7badec7921a46954f52c8",
    "covers": "descriptor.body"
  },
  "body": {
    "hash": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
    "hash_short": "f1b9f8142d5f",
    "kind": "plan",
    "actor": "s0fractal",
    "visibility": "descriptor-public-payload-private",
    "oct": "oct:6.4",
    "payload": {
      "state": "private-local",
      "contains_payload": false,
      "locator_hint": "myc-private-payload:f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
      "retention_policy": "do-not-copy-by-default"
    },
    "note": "This descriptor commits to raw payload. It does not contain payload bytes."
  }
}
```
