---
chord:
  primary: "oct:2.receipt"
  secondary: ["oct:6.ledger", "oct:1.physics"]
energy: 0.82
mode: "OBSERVE"
tension: "spore-substrate-adapter-draft"
confidence: "medium"
receipt: "file"
---

# SPORE Adapter Draft

SPORE is the deterministic apply-record substrate.

```yaml
substrate:
  name: "spore"
  local_path: "~/trinity/probes"
  role: "deterministic-mutation-receipts"

adapter_policy:
  status: "draft"
  read_policy: "explicit-files"
  write_policy: "receipt-only"
  payload_policy: "descriptor-only"
  side_effects: ["file-read", "file-write"]
  verification: ["record-hash", "record-field-agreement", "fuel-boundary"]
  failure_mode: "hard-stop"

boundaries:
  myc_does_not_execute_wasm: true
  myc_does_not_authorize_bridges: true
  public_receipts_must_be_recomputable: true
```

## Publication Boundary

MYC may publish SPORE receipts as descriptors. It verifies that the descriptor
is internally consistent with the raw SPORE apply record: `spore_id`, mutator
hash, argument hashes, expected output hash, and apply-boundary fuel must agree.

MYC does not claim that the mutator execution happened correctly. That proof
belongs to the SPORE executor, meter, or a future Omega verifier.
