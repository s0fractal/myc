---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7"]
energy: 0.61
mode: "OBSERVE"
tension: "example-private-photo-raw-commitment"
confidence: "low"
receipt: "file"
---

# h.12f026ff.photo.raw.myc.md

This is an example descriptor. It is not the photo.

```yaml
raw:
  fqdn: "h.12f026ff.photo.raw.myc.md"
  hash:
    algorithm: "sha256"
    value: "12f026ff-example-short-hash"
    covers: "encrypted-payload"
  kind: "photo"
  created_at: null
  captured_by: "unknown"
  visibility: "mixed"

payload:
  state: "remote-capability"
  contains_payload: false
  owner_hint: "people"
  locator_hint: "google-drive"
  retention_policy: "do-not-copy"

access:
  mode: "capability"
  capability_hash: "h.capability-example"
  scope: "recognize-only"
```

The public descriptor can exist while the payload remains private.
