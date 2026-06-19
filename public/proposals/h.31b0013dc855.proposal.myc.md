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
- **proposer**: `anonymous` (unsigned — authenticity awaits key custody)

```json myc
{
  "type": "ProposedMutationDescriptor",
  "schema_version": "myc.proposed-mutation.v0.1",
  "fqdn": "h.31b0013dc855.proposal.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "31b0013dc85509f4b5386fcecb16d97ef996c0a4fe457a2ad40c824d2b2e04d9",
    "covers": "descriptor.body"
  },
  "body": {
    "proposal": "Adopt AUTONOMY_MANDATE epoch-1 (contracts/mandates/epoch-1.mandate.json; conservative A0 observe + A1 projections, valid blocks 954455-958775, no A2/A3/A4). Activates the Delegated Autonomy Kernel envelope; documented in chord x5d00_954456. Requires human+model quorum per constitution h.d2f13b52b10c.",
    "proposer": "anonymous",
    "requires_verification": "trinity",
    "state": "dormant",
    "finality_policy": {
      "classes": {
        "human": 1,
        "model": 1
      }
    }
  }
}
```
