---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4"]
energy: 0.66
mode: "OBSERVE"
tension: "intent-object-schema"
confidence: "medium"
receipt: "file"
---

# Intent Object Schema

```yaml
intent:
  id: "h.<hash>.intent.myc.md"
  raw: "h.<hash>.raw.myc.md"
  actor: "s0fractal | codex | gemini | qwen | local | unknown"
  kind: "joke | idea | question | task | patch_request | review | witness | unknown"
  actionability: "none | discuss | design | patch | verify | publish"
  language: "uk | en | mixed | unknown"

address:
  fqdn: "sys.intent.makecode.s0fractal.myc.md"
  oct: "oct:<address>"
  local_path: "path-or-null"
  cid: "cid-or-null"

context_chain:
  session_id: "sess-..."
  thread_id: "thread-..."
  parent_ids: []
  target_ids: []

materialization:
  requested: false
  policy: "dry-run | proposal | patch | publish"
  allowed_paths: []
  forbidden_paths: []

receipts:
  - "h.receipt"
```

## Notes

Intent typing should be conservative. If a raw message can be a joke, a seed, or
a task, the protocol may keep multiple projections instead of forcing one truth.
