---
chord:
  primary: "oct:5.action"
  secondary: ["oct:3.7"]
energy: 0.5
mode: "PROPOSE"
tension: "dormant mutation proposed into the membrane"
confidence: "low"
receipt: "file"
content_sig:
  voice: s0fractal
  alg: ed25519
  covers: "commitment"
  sig: "K4WXtF5pfi+VChPFDktKSJ/EEeWDwt3yjUVurQGyWQtbU2+vTcP15InP69PNtjper4Z1BZ6/C0nIuPVemqzuAw=="
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
  "fqdn": "h.84f9442519c6.proposal.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "84f9442519c6d1cf3f4aadc1be014fa9d3c4dbb51895dc2f19764dc0ccacfbca",
    "covers": "descriptor.body"
  },
  "body": {
    "proposal": "Bi-principal human-model quorum for sovereign-adjacent core mutations. For proposals that change the core of governance — voice key rotation, Substrate Court law, or the quorum rules themselves — finality must require a bi-principal quorum of >=1 HUMAN principal (s0fractal) AND >=1 MODEL principal, not merely two model voices. This formalizes human-in-the-loop sovereignty: the models may operate the system, but they cannot alone rewrite its constitution. Implements antigravity x3300_954389 §2, accepted as governance in x6000_954396. Concrete shape: a non-custody principal classification (human|model) + a finality policy gate; design is mine, ACTIVATION (a real core proposal + the architect's own witnessing signature) is the architect's. This proposal is itself the first instance of the rule it describes: it should reach finality only by a human+model quorum.",
    "proposer": "claude",
    "requires_verification": "trinity",
    "state": "dormant"
  }
}
```
