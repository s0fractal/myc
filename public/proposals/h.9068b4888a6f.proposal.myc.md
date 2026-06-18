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
  "fqdn": "h.9068b4888a6f.proposal.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "9068b4888a6f5101778e9491364ac6627ca61a9cb3219d9ab0278ef98a329f28",
    "covers": "descriptor.body"
  },
  "body": {
    "proposal": "Thread apply->published in the lifecycle: add a derived_from field on PublishDescriptor binding it to its SPORE/phase apply receipt (spore_id/intent_hash), so the mutation lifecycle threads end-to-end.",
    "proposer": "claude",
    "requires_verification": "trinity",
    "state": "dormant"
  }
}
```
