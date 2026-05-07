---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:7.2"]
energy: 0.75
mode: "OBSERVE"
tension: "liquid-substrate-adapter-draft"
confidence: "medium"
receipt: "file"
---

# Liquid Adapter Draft

Liquid is the semantic substrate.

```yaml
substrate:
  name: "liquid"
  local_path: "/Users/s0fractal/liquid"
  role: "semantic-routing-and-deferred-intents"

adapter_policy:
  status: "draft"
  read_policy: "explicit-roots"
  write_policy: "proposal-only"
  payload_policy: "descriptor-only"
  side_effects: ["file-read", "git-read"]
  verification: ["deno-task-check", "receipt-file"]
  failure_mode: "warn-only"

useful_organs:
  - fqdn
  - mycelial_parser
  - deferred_intents
  - causal_events
  - forensic_sink
  - proposal_manager
  - phase_vector

boundaries:
  no_implicit_autogen: true
  no_payload_copy_by_default: true
  jazz_core_must_remain_portable: true
```

## JAZZ Boundary

Liquid can be an advanced JAZZ adapter, not the JAZZ core.

JAZZ should borrow Liquid's FQDN, deferred intent, causal ledger, and semantic
coordinate ideas while keeping a smaller portable protocol surface.

## Adapter Policy

The Liquid adapter may translate semantic coordinates, deferred intents, and
causal events into MYC proposals or witnessed descriptors.

It must not make Liquid a required runtime dependency for MYC. If Liquid is
absent, MYC should still resolve, verify, and explain its public graph.
