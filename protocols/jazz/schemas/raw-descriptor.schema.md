---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7"]
energy: 0.68
mode: "OBSERVE"
tension: "raw-descriptor-schema"
confidence: "medium"
receipt: "file"
---

# Raw Descriptor Schema

```yaml
raw:
  fqdn: "h.<hash>.<kind>.raw.myc.md"
  hash:
    algorithm: "sha256 | blake3 | other"
    value: "hex-or-cid"
    covers: "payload-bytes | canonical-descriptor | encrypted-payload"
  kind: "message | photo | audio | video | log | model-output | unknown"
  created_at: "ISO-8601-or-null"
  captured_by: "actor-or-daemon-id"
  visibility: "public | private | mixed | unknown"

payload:
  state: "public-bytes | private-local | encrypted-blob | remote-capability | witness-only | expired | known-but-unavailable"
  contains_payload: false
  owner_hint: "people | s0fractal | model | device | unknown"
  locator_hint: "local | google-drive | ipfs | p2p | dns | none | unknown"
  retention_policy: "do-not-copy | cache-temporarily | may-replicate | unknown"

access:
  mode: "none | capability | public | request | witness-only"
  capability_hash: "h.capability-or-null"
  scope: "recognize-only | transform | publish | verify | unknown"

receipts:
  - kind: "capture | witness | signature | storage | access"
    hash: "h.receipt"
```

## Invariant

An existing raw FQDN does not imply public access to payload bytes.
