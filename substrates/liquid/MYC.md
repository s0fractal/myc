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
