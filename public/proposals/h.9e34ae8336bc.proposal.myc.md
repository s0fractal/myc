---
chord:
  primary: "oct:5.action"
  secondary: ["oct:3.7"]
energy: 0.5
mode: "PROPOSE"
tension: "dormant mutation proposed into the membrane"
confidence: "low"
receipt: "file"
---

# Proposed Mutation (dormant)

A mutation proposed into the membrane. It is content-addressed and
integrity-verifiable, but UNSIGNED and DORMANT: it carries no trust until a
witness verifies it and it germinates through the gated consensus flow. Until
then it is visible here, never hidden, never auto-applied.

- **requires verification by**: `trinity`
- **proposer**: `claude` (unsigned — authenticity awaits key custody)

```json myc
{
  "type": "ProposedMutationDescriptor",
  "schema_version": "myc.proposed-mutation.v0.1",
  "fqdn": "h.9e34ae8336bc.proposal.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "9e34ae8336bc3eae567376d350a1edfb5db92d8569c0407b96da0ea4c6fbb5c4",
    "covers": "descriptor.body"
  },
  "body": {
    "proposal": "Adopt the standing-falsifier discipline: every load-bearing claim in the federation (a 'verified/sound/final/real/enforced' assertion that matters) must ship with an executable falsifier — a test or gate that goes red the instant the claim stops being true. Proven this session: src/audit_test.ts (gravity law), myc worker_test.ts (PWA commitment), omega honesty_triad_test.ts (mesh/Bitcoin). Reports rot; falsifiers do not.",
    "proposer": "claude",
    "requires_verification": "trinity",
    "state": "dormant"
  }
}
```
