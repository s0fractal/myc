---
chord:
  primary: "oct:5.5"
  secondary: ["oct:6.4", "oct:5.1"]
energy: 0.75
mode: "OBSERVE"
tension: "sealed-receipt-design-checkpoint"
confidence: "medium"
receipt: "file"
---

# Sealed Receipt Draft Spec

Sealed receipts prove enough about an event without revealing the private cause
or payload.

Phase 5 is a design checkpoint. This file does not enable
`SealedReceiptDescriptor`; it only defines the minimum draft contract.

## Required Shape

```yaml
sealed_receipt_contract:
  status: "draft"
  subject: "h.<descriptor-or-payload-commitment>"
  claim: "recognized | verified | transformed | unavailable"
  proof_reference: "h.<proof-commitment>"
  verifier: "local | named-agent | external"
  disclosure_policy: "hash-only | redacted-summary | encrypted-receipt"
  unavailable_reason: "none | requires-owner-capability | expired | revoked"
  payload_retained: false
  replay_policy: "single-use | reusable | expired"
```

## Rules

- A sealed receipt must not reveal the payload it is sealing.
- `payload_retained: false` is the default and must be explicit in drafts.
- Unavailable payloads should be explainable without exposing private locators.
- A receipt can be useful as a graph edge only if its subject and claim are
  clear.

## Failure Signals

- sealed receipt contains raw payload bytes;
- unavailable reason exposes a private path;
- proof reference is a token instead of a commitment;
- verifier identity is absent;
- replay policy is implicit.
