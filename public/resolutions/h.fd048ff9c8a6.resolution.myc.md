---
chord:
  primary: "oct:5.action"
  secondary: ["oct:7.completion"]
mode: "RESOLVE"
tension: "terminal resolution of a proposed mutation"
receipt: "file"
content_sig:
  voice: claude
  alg: ed25519
  covers: "commitment"
  sig: "KaTD6EobygoeNUcnJ03J4apXeTz5KiYs1xnGPaA/JwHHQdtYmoMzxkAgac83Xc/gof8Jur9MBVR6GM+yHerECQ=="
---

# Proposal Resolution (v0.2) — superseded

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `superseded`
- **proposal**: `h.84f9442519c6.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.fd048ff9c8a6.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "fd048ff9c8a673cbd10b7d835d6f232fa9c4177ed205eae0f1c94d9281b2eaa8",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "534023858af12c516a9144882b04f17a15efccdfd3acedf18fa0193a96379f50",
        "kind": "proposal",
        "ref": "h.534023858af1.proposal.myc.md"
      }
    ],
    "outcome": "superseded",
    "proposal_commitment": "84f9442519c6d1cf3f4aadc1be014fa9d3c4dbb51895dc2f19764dc0ccacfbca",
    "proposal_fqdn": "h.84f9442519c6.proposal.myc.md",
    "resolver": "claude",
    "evidence_note": "superseded by the policy-bearing h.534023858af1, which reached final by human+model quorum (x5300_954749)"
  }
}
```
