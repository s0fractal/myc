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

# intent.task.claude.h.f24c45208983.myc.md

Deterministic intent classification descriptor.

```json myc
{
  "type": "IntentDescriptor",
  "schema_version": "myc.intent.v0.2",
  "fqdn": "intent.task.claude.h.f24c45208983.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "8a7d430c5f53c8f6a5ada23f4195c4cd2adba70438940146d4eb2ced9450047c",
    "covers": "descriptor.body"
  },
  "body": {
    "intent": {
      "id": "intent.task.claude.h.f24c45208983.myc.md",
      "raw": "h.f24c45208983.knowledge.claude.raw.myc.md",
      "actor": "claude",
      "kind": "task",
      "actionability": "patch",
      "language": "unknown"
    },
    "address": {
      "fqdn": "intent.task.claude.h.f24c45208983.myc.md",
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
      "raw_hash": "f24c4520898371f6523a45200291d00696f3b1aece2053951eb435a8da02c2ea",
      "confidence": "medium",
      "classifier": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "signals": [
        "task:write",
        "task:run",
        "task:verify"
      ]
    }
  }
}
```
