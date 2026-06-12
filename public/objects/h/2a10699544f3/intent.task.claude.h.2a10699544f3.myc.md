---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "intentdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# intent.task.claude.h.2a10699544f3.myc.md

Deterministic intent classification descriptor.

```json myc
{
  "type": "IntentDescriptor",
  "schema_version": "myc.intent.v0.2",
  "fqdn": "intent.task.claude.h.2a10699544f3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "031fd775b2e7f303afbe4e3a6ed42365995be967079150c2f7f7f2b06340455b",
    "covers": "descriptor.body"
  },
  "body": {
    "intent": {
      "id": "intent.task.claude.h.2a10699544f3.myc.md",
      "raw": "h.2a10699544f3.projection-descriptor.claude.raw.myc.md",
      "actor": "claude",
      "kind": "task",
      "actionability": "patch",
      "language": "unknown"
    },
    "address": {
      "fqdn": "intent.task.claude.h.2a10699544f3.myc.md",
      "oct": "oct:5.1",
      "local_path": null,
      "cid": null
    },
    "context_chain": {
      "session_id": "none",
      "thread_id": "none",
      "parent_ids": [],
      "target_ids": []
    },
    "materialization": {
      "requested": true,
      "policy": "proposal",
      "allowed_paths": [],
      "forbidden_paths": []
    },
    "legacy_meta": {
      "raw_hash": "2a10699544f3f140af02c4741baff19c24220e152788f9c17518570065b20b62",
      "confidence": "medium",
      "classifier": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "signals": [
        "task:add",
        "task:verify"
      ]
    }
  }
}
```
