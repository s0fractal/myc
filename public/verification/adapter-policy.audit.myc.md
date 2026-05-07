---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.78
mode: "REVIEW"
tension: "adapter-policy-audit"
confidence: "high"
receipt: "file"
---

# Adapter Policy Audit

Adapter policy is now an audited checkpoint before adapter implementation.

Executable guardrail:

```bash
deno task audit
```

The audit requires every `substrates/<name>/MYC.md` file to declare:

- `adapter_policy`
- `read_policy`
- `write_policy`
- `payload_policy`
- `side_effects`
- `verification`
- `failure_mode`

This keeps substrate notes from turning into silent authority grants.

Current boundary:

- adapters are optional;
- adapter failure must not break graph verification;
- adapter output must be a descriptor, transform, receipt, proposal, or warning;
- payload access is denied unless policy says otherwise;
- writes default to `proposal-only`;
- broad filesystem scanning remains outside the protocol.

This does not enable adapters. It only makes future adapter work reviewable.
