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
  sig: "cDxK8jSvA6fvpEhAJFA0pv7LyoTctoFOHYGROxNYolGlSku0NUfQSiTRG62IMg9iOP1KdeUqBwihjbPROsqxBA=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.3b418ab2dd66.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.5528ddc4d803.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "5528ddc4d803a4c5b318f4b7c651ae76c469912c995c1a3f4d0c43e0e1601820",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "14a0c62547b99ecb4b837fa9b499bfbda7805d87755654a62dfbaae1c214b5f7",
        "kind": "chord",
        "ref": "x3300_955316_claude_claude-co-ratifies-human-to-advisor-on-architects"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "3b418ab2dd66627c3e7624611f5e465b392e4f1844cd92836075a31c1f3447e0",
    "proposal_fqdn": "h.3b418ab2dd66.proposal.myc.md",
    "resolver": "claude"
  }
}
```
