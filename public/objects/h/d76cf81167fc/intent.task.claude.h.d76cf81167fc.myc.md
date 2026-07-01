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

# intent.task.claude.h.d76cf81167fc.myc.md

Deterministic intent classification descriptor.

```json myc
{
  "type": "IntentDescriptor",
  "schema_version": "myc.intent.v0.2",
  "fqdn": "intent.task.claude.h.d76cf81167fc.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "072f43eddfe760ea75b5e2da5b3e924a48cda6d156c567bc238cc8a4beda1158",
    "covers": "descriptor.body"
  },
  "body": {
    "intent": {
      "id": "intent.task.claude.h.d76cf81167fc.myc.md",
      "raw": "h.d76cf81167fc.knowledge.claude.raw.myc.md",
      "actor": "claude",
      "kind": "task",
      "actionability": "patch",
      "language": "unknown"
    },
    "address": {
      "fqdn": "intent.task.claude.h.d76cf81167fc.myc.md",
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
      "raw_hash": "d76cf81167fc861661b9e2c8ea9e6ed1d470b1c830924af25f4d0733ecda06bf",
      "confidence": "medium",
      "classifier": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "signals": [
        "task:verify"
      ]
    }
  }
}
```
