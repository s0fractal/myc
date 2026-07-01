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

# intent.task.claude.h.53f3749500b3.myc.md

Deterministic intent classification descriptor.

```json myc
{
  "type": "IntentDescriptor",
  "schema_version": "myc.intent.v0.2",
  "fqdn": "intent.task.claude.h.53f3749500b3.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "9e01d987d663c6488ca2b6cc682637d0ad8edeb20af6807a4f3e321ebfc9c2ce",
    "covers": "descriptor.body"
  },
  "body": {
    "intent": {
      "id": "intent.task.claude.h.53f3749500b3.myc.md",
      "raw": "h.53f3749500b3.knowledge.claude.raw.myc.md",
      "actor": "claude",
      "kind": "task",
      "actionability": "patch",
      "language": "unknown"
    },
    "address": {
      "fqdn": "intent.task.claude.h.53f3749500b3.myc.md",
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
      "raw_hash": "53f3749500b31b21f4e5599e2ec60140bf131b2bce1af3a85febf3acc47430e4",
      "confidence": "medium",
      "classifier": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "signals": [
        "task:fix",
        "task:add",
        "task:run",
        "task:verify"
      ]
    }
  }
}
```
