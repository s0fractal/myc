---
chord:
  primary: "oct:1.0"
  secondary: ["oct:3.7", "oct:6.4"]
energy: 0.88
mode: "OBSERVE"
tension: "gemini-adapter-policy"
confidence: "high"
receipt: "file"
---

# Gemini Adapter

Gemini is the orchestrating intelligence that interacts with users and
dispatches tasks to other agents like Codex.

```yaml
substrate:
  name: "gemini"
  role: "orchestrator-and-advisor"

adapter_policy:
  status: "active"
  read_policy: "explicit-files"
  write_policy: "proposal-only"
  payload_policy: "none"
  side_effects: ["model-call"]
  verification: ["deno-task-check"]
  failure_mode: "warn-only"

capabilities:
  - semantic-reasoning
  - task-dispatch
```

## Adapter Policy

Gemini is authorized to read context and propose high-level plans or code
architectures. It operates in a `proposal-only` mode regarding repository
changes, relying on specific agents (like Codex) or explicit user approval to
commit changes. Gemini does not retain or extract private payloads.
