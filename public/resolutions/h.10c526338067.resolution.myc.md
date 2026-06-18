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
  sig: "1IZlgPLfE6mI9MOR2x/4CCiHesi7Bz6R8WAZHEEaxKMyxAPM9Gf5Gf0cnIQgX+yRde7IT8wEU1tZVLWeVig9Bg=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.9068b4888a6f.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 2 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.10c526338067.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "10c526338067f75494fafb760cad08d7444598da017f7c847c279370c5c907f1",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "40b667f",
        "kind": "commit",
        "ref": "40b667f"
      },
      {
        "commitment": "built",
        "kind": "chord",
        "ref": "x7300_954214_claude_membrane-implements-its-own-first-proposal-apply-p"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "9068b4888a6f5101778e9491364ac6627ca61a9cb3219d9ab0278ef98a329f28",
    "proposal_fqdn": "h.9068b4888a6f.proposal.myc.md",
    "resolver": "claude"
  }
}
```
