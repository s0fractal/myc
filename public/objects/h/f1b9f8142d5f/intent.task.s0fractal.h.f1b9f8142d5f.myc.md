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

# intent.task.s0fractal.h.f1b9f8142d5f.myc.md

Deterministic intent classification descriptor.

```json myc
{
  "type": "IntentDescriptor",
  "schema_version": "myc.intent.v0.2",
  "fqdn": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "59b0b010880cd728c539dee69248e93d7077546d3fc5ae6cf5159e55f269c95a",
    "covers": "descriptor.body"
  },
  "body": {
    "intent": {
      "id": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md",
      "raw": "h.f1b9f8142d5f.plan.s0fractal.raw.myc.md",
      "actor": "s0fractal",
      "kind": "task",
      "actionability": "patch",
      "language": "unknown"
    },
    "address": {
      "fqdn": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md",
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
      "raw_hash": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
      "confidence": "medium",
      "classifier": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "signals": [
        "task:implement",
        "task:write",
        "task:create",
        "task:add",
        "task:update",
        "task:run",
        "task:verify",
        "idea:protocol",
        "question:?",
        "question:what"
      ]
    }
  }
}
```
