---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:5.1"]
energy: 0.79
mode: "OBSERVE"
tension: "jazz-protocol-root"
confidence: "medium"
receipt: "file"
---

# JAZZ Protocol

JAZZ is an anti-orchestration protocol for typed intents, model responses,
receipts, and materialization without a central conductor.

It should be small enough to run as a wrapper around local model CLIs, but
strict enough to preserve provenance:

```text
raw input
  -> capture
  -> canonicalize
  -> classify
  -> name
  -> route
  -> respond
  -> normalize
  -> verify
  -> materialize
  -> ledger
```

The model is not forced into a role. It emits. The protocol listens, wraps,
checks, and remembers.

## Non-Goals

- JAZZ is not a model orchestrator.
- JAZZ is not a hidden manager agent.
- JAZZ is not a data lake.
- JAZZ should not copy private payloads by default.
- JAZZ should not pretend that LLM classification is deterministic unless the
  classifier is actually frozen and reproducible.

## Useful Adapters

- Genesis: deterministic physics, tests, receipts, frozen layers.
- Liquid: semantic routing, FQDN, deferred intents, causal events.
- Local FS: first scene and ledger.
- Google Drive: private payload store / capability source.
- IPFS: optional content-addressed public payloads.
- Radicle: optional discussion and patch consensus.
