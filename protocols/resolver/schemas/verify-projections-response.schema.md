---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4"]
energy: 0.68
mode: "OBSERVE"
tension: "verify-projections-response-schema"
confidence: "medium"
receipt: "file"
---

# Verify Projections Response Schema

```yaml
ok: "boolean"
index_path: "string"
graph_path: "string"
index_synced: "boolean"
graph_synced: "boolean"
descriptor_count: "number"
index_record_count: "number"
errors: ["string"]
warnings: ["string"]
```

Rules:

- `ok` is true only when both generated projections match current descriptor
  content and graph verification passes.
- `index_path` and `graph_path` are local resolver context and must not be
  copied into public graph artifacts.
- `index_synced` compares public index content as an unordered NDJSON set.
- `graph_synced` compares public graph content exactly because graph edge order
  is part of the generated projection.
