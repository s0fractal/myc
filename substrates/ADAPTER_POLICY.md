---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.82
mode: "PATCH"
tension: "adapter-policy-before-adapters"
confidence: "high"
receipt: "file"
---

# Adapter Policy

Adapters connect MYC to local or remote substrates. They are not part of the
core graph. They may observe, classify, propose, and emit receipts. They must
not become hidden sources of truth.

This policy exists before adapter implementation so future models can extend the
system without silently widening authority.

## Required Policy Block

Every `substrates/<name>/MYC.md` file must include an `adapter_policy` block:

```yaml
adapter_policy:
  status: "draft | active | quarantined"
  read_policy: "none | explicit-roots | explicit-files | capability-required"
  write_policy: "none | proposal-only | receipt-only | explicit-commit"
  payload_policy: "none | descriptor-only | sealed-only | capability-required"
  side_effects: ["none"]
  verification: ["deno-task-check"]
  failure_mode: "warn-only | quarantine | hard-stop"
```

The block is intentionally small. The exact adapter can add substrate-specific
details, but these keys are mandatory.

## Authority Rules

- Core verification must work when every adapter is absent.
- Adapter failure must not break `verify-graph`.
- Adapter output must be a descriptor, transform, receipt, proposal, or warning.
- Adapter output must be reproducible or explicitly witnessed.
- Adapter writes must be visible as reviewable diffs or local receipts.
- No adapter may mutate public core files without an explicit command path.
- No adapter may copy private payloads into public descriptors.
- No adapter may perform broad filesystem scans without explicit local policy.

## Payload Rules

`payload_policy` controls what the adapter may do with raw bytes:

- `none`: no payload reads.
- `descriptor-only`: may read descriptors and hashes, not payload bytes.
- `sealed-only`: may handle sealed/local receipts without public disclosure.
- `capability-required`: may request payload access through an explicit
  capability, never by discovering and copying it silently.

The public graph should remain useful when payload access is unavailable.

## Write Rules

`write_policy` controls materialization:

- `none`: read-only adapter.
- `proposal-only`: may emit proposals, never apply them directly.
- `receipt-only`: may record observed facts or verification receipts.
- `explicit-commit`: may write only through a human-visible command, check, and
  commit path.

When in doubt, use `proposal-only`.

## Side Effects

Side effects must be declared before execution:

- `none`
- `file-read`
- `file-write`
- `network-read`
- `network-write`
- `model-call`
- `test-run`
- `git-read`
- `git-write`

Undeclared side effects are protocol drift.

## Promotion Gate

An adapter can move from `draft` to `active` only after:

- its policy block is present and audited;
- dry-run behavior is documented;
- output shape is documented;
- private leakage tests exist if it can see private material;
- failure behavior is boring and reversible.
