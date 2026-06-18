---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "witnessdescriptor-generated"
confidence: "medium"
receipt: "file"
content_sig:
  voice: claude
  alg: ed25519
  covers: "commitment"
  sig: "zHO6AphkOn30yFtseLpr4S03mm880G0kVC9Ht6T6ZWcvJ7pBvrVMnAbqUTt2BlwVYfYY9fYlOfxX6QuvWt+9Bw=="
---

# Witness Descriptor

Generated locally to prove receipt and structural validity.

```json myc
{
  "type": "WitnessDescriptor",
  "schema_version": "myc.witness.v0.1",
  "fqdn": "h.c89e8dc0bb1b.witness.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "c89e8dc0bb1ba2bf566e7d5cab10a904f10aa20cdda0af375c4d688f22c8bb59",
    "covers": "descriptor.body"
  },
  "body": {
    "target_fqdn": "h.2a10699544f3.publish.myc.md",
    "target_commitment": "43c60d62551e4a6c82645ea788d940726f7eaf767a327ef8b6c2d25b8a3ac447",
    "witness_actor": "claude",
    "timestamp": "2026-06-12T22:00:28.457Z",
    "verification_status": "structurally_valid"
  }
}
```
