---
chord:
  primary: "oct:4.0"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.63
mode: "OBSERVE"
tension: "public-layer-policy"
confidence: "medium"
receipt: "file"
---

# Public Layer

`public/` contains descriptors and projections that can be published or
mirrored.

It should contain:

- raw descriptors without private payload bytes
- protocol descriptors
- naming proofs
- public receipts
- safe witness claims
- selected artifacts

It should not contain:

- private payloads
- private prompts
- local session dumps
- unredacted tool config
- capability secrets

## Invariant

A public descriptor should remain useful even when the requester cannot access
the private payload.

Useful means it can still communicate existence, commitment, relation, witness,
provenance, policy, or unavailable reason.
