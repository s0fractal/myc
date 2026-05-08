---
chord:
  primary: "oct:1.0"
  secondary: ["oct:3.7", "oct:6.4"]
energy: 0.88
mode: "OBSERVE"
tension: "codex-adapter-policy"
confidence: "high"
receipt: "file"
---

# Codex Adapter

Codex is the local AI assistant operating directly inside the repository. It has
access to the local filesystem and the ability to execute terminal commands.

```yaml
substrate:
  name: "codex"
  role: "local-agent-operator"

adapter_policy:
  status: "active"
  read_policy: "explicit-files"
  write_policy: "explicit-commit"
  payload_policy: "descriptor-only"
  side_effects: ["file-read", "file-write", "test-run", "git-write"]
  verification: ["deno-task-check"]
  failure_mode: "warn-only"

capabilities:
  - local-filesystem
  - local-terminal
  - explicit-commit
```

## Adapter Policy

Codex is authorized to read the local filesystem and propose or execute changes.
Every materialization by Codex must pass through the standard `deno task check`
pipeline and be explicitly committed. Codex acts as a verifier and operator
within the defined MYC protocols.
