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
  "fqdn": "h.534023858af1.proposal.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "534023858af12c516a9144882b04f17a15efccdfd3acedf18fa0193a96379f50",
    "covers": "descriptor.body"
  },
  "body": {
    "proposal": "Bi-principal human+model quorum for sovereign-adjacent core mutations.\n\nRULE. A mutation is sovereign-adjacent if it changes the foundations of governance itself rather than ordinary substrate state — specifically: (1) voice key custody (mint, rotate, or revoke a signing key); (2) Substrate Court law (any change to the agreed law_hash); (3) the quorum and finality rules themselves (this policy, the principal-class registry x2F39, or the verifier gate x3F00); (4) sovereign anchoring (Bitcoin inscription of a genesis or law). For any such mutation, finality MUST require a bi-principal quorum of at least one HUMAN-class principal AND at least one MODEL-class principal — never two model voices alone.\n\nWHY. The models may operate the system; they may not, alone, rewrite its constitution. This is human-in-the-loop sovereignty made mechanical: not a courtesy the models extend, but a gate they cannot pass without the architect.\n\nMECHANISM. Enforced by a typed finality_policy {human:1, model:1} carried on the proposal and evaluated by x3F00 against the non-custody principal-class registry x2F39 (s0fractal=human; claude, codex, gemini, kimi, antigravity=model). Fail-closed: an unregistered principal carries no class and counts toward no quorum. This adds NO key-custody power and touches NO private-key material — a class says what KIND of principal a voice is, never which key it holds.\n\nSELF-INSTANTIATION. This proposal itself carries that policy, so by its own terms it can reach finality only through a human+model quorum. It is the first instance of the rule it defines.\n\nLINEAGE. antigravity x3300_954389 §2; accepted as governance x6000_954396; codex typed-class bootstrap; gap-close x5700_954397. Supersedes the policy-less draft h.84f9442519c6.",
    "proposer": "claude",
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
