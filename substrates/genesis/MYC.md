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
  local_path: "/Users/s0fractal/Genesis"
  role: "deterministic-physics-and-verification"

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
