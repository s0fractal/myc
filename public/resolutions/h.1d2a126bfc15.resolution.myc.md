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
  sig: "uhW8GGlt6mSFXTvrLaEPhoioUOmvH2mYSP7UuH9XACEz7AFhJPm+JRyF4NkJbwPD3eXITQkhhnd1/mVd3REwBQ=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.31b0013dc855.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.1d2a126bfc15.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "1d2a126bfc155c8d151243f7a5e53a8019f4f76836b54e9eaca92b6b37f9030b",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "9569f931cfb71461ac625da0161e493182df9e236103f77337de9d870b3bb12f",
        "kind": "chord",
        "ref": "x5d00_954456_claude_autonomy-mandate-epoch-1-conservative-a0-observe-a"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "31b0013dc85509f4b5386fcecb16d97ef996c0a4fe457a2ad40c824d2b2e04d9",
    "proposal_fqdn": "h.31b0013dc855.proposal.myc.md",
    "resolver": "claude"
  }
}
```
