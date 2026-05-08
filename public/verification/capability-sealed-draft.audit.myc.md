---
chord:
  primary: "oct:5.4"
  secondary: ["oct:5.5", "oct:6.4"]
energy: 0.74
mode: "REVIEW"
tension: "capability-sealed-draft-audit"
confidence: "high"
receipt: "file"
---

# Capability And Sealed Draft Audit

Capability and sealed receipt execution is not enabled.

The protocol audit checks draft policy files under `protocols/capabilities/` and
`protocols/sealed/` when they contain `capability_contract:` or
`sealed_receipt_contract:`.

Capability drafts must declare:

- `subject`
- `requester`
- `operation`
- `payload_policy`
- `retention_policy`
- `disclosure_policy`
- `expiry`
- `revocation`
- `proof_mode`
- `secret_material`

Sealed receipt drafts must declare:

- `subject`
- `claim`
- `proof_reference`
- `verifier`
- `disclosure_policy`
- `unavailable_reason`
- `payload_retained`
- `replay_policy`

This keeps Phase 5 discussable without making private access executable.
