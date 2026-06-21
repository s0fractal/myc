---
chord:
  primary: "oct:5.action"
  secondary: ["oct:7.completion"]
mode: "RESOLVE"
tension: "terminal resolution of a proposed mutation"
receipt: "file"
content_sig:
  voice: s0fractal
  alg: ed25519
  covers: "commitment"
  sig: "ZQorJRN/veexxpI5qVbpxiHkiROrkuXYSTEONgqNJ6J9SBHLsUCSbN2qx3ucgbNX38hE4SpwNs+90jZll2U7CQ=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.534023858af1.proposal.myc.md`
- **resolver**: `s0fractal` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.88a5cd4b0845.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "88a5cd4b0845d360690933a2233d6f649c1955b451665932ae8f30ddd0127d32",
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
    "resolver": "s0fractal"
  }
}
```
