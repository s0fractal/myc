---
chord:
  primary: "oct:1.0"
  secondary: ["oct:5.1", "oct:6.4"]
energy: 0.72
mode: "OBSERVE"
tension: "genesis-substrate-adapter-draft"
confidence: "medium"
receipt: "file"
---

# Genesis Adapter Draft

Genesis is the deterministic physical substrate.

```yaml
substrate:
  name: "genesis"
  local_path: "~/Genesis"
  role: "deterministic-physics-and-verification"

adapter_policy:
  status: "draft"
  read_policy: "explicit-roots"
  write_policy: "proposal-only"
  payload_policy: "descriptor-only"
  side_effects: ["file-read", "test-run", "git-read"]
  verification: ["cargo-test-workspace", "deno-task-check", "receipt-file"]
  failure_mode: "warn-only"

capabilities:
  - rust-tests
  - deno-tests
  - deterministic-kernel
  - task-ledger
  - jazz-events

boundaries:
  frozen_layers: "do-not-mutate-without-explicit-protocol"
  model_role: "verifier-operator-oracle-not-inhabitant"
  receipts_required: true
```

## JAZZ Boundary

JAZZ may create proposals, reviews, receipts, and task events for Genesis. It
should not silently mutate frozen physical layers.

Materialization into Genesis should pass through explicit file receipts, tests,
and reviewable diffs.

## Adapter Policy

The Genesis adapter may inspect declared repository roots and emit reviews,
proposals, task notes, and verification receipts.

It must not mutate frozen physical layers directly. Any code change belongs to
Genesis' own review and test path, with the diff visible before commit.
