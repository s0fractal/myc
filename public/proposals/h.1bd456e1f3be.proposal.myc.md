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
  "fqdn": "h.1bd456e1f3be.proposal.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "1bd456e1f3be933aa755cd64c851bee3d3c9b35a37ac8c112d3d23ccfe61e044",
    "covers": "descriptor.body"
  },
  "body": {
    "proposal": "Adopt the A1 write-capability attenuation rule v1 (codex x5d00_954460; verifier src/x5C70_autonomy_attenuation.ts). Authorizes wiring evaluateA1Attenuation into admit/executor so a confined writes-generator may EXECUTE as A1 inside a ratified profile — capability stays writes/A2; only writes attenuable; git/network/subprocess/unknown barred. Core admission-law mutation; requires human+model quorum per constitution h.d2f13b52b10c.",
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
