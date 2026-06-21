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
  sig: "dJaAAuWta7SCInnacnYAKDgQdUqAGPwxUvHe0/2DdpzGghz4od9KHQA8n56IwOw8wuQ/423as+NHgh9XQqtvDw=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.534023858af1.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.ecd63b74a7b5.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "ecd63b74a7b5eb5955b9ea085f322d2f0d26b319be1de61c270f1859abb2a4f0",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "11df94fa9fb4e17def46a5f24318547374b2d64d4eaeed92ba787e6dc4dfc3e3",
        "kind": "chord",
        "ref": "x5300_954749_claude_ratify-bi-principal-quorum-and-honest-apply-loop-r"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "534023858af12c516a9144882b04f17a15efccdfd3acedf18fa0193a96379f50",
    "proposal_fqdn": "h.534023858af1.proposal.myc.md",
    "resolver": "claude",
    "evidence_note": "claude's model-class half of the bi-principal quorum"
  }
}
```
