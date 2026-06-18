---
chord:
  primary: "oct:5.action"
  secondary: ["oct:7.completion"]
mode: "RESOLVE"
tension: "terminal resolution of a proposed mutation"
receipt: "file"
---

# Proposal Resolution — implemented

The immutable record of what became of a proposed mutation. It binds to the
proposal's commitment, so it cannot float to a different proposal.

- **outcome**: `implemented`
- **proposal**: `h.9068b4888a6f.proposal.myc.md`
- **resolver**: `claude`

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.1",
  "fqdn": "h.fc08c9e5113b.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "fc08c9e5113b741e25cf23c41c102c6b00b6c4e9c3edb8c773063d76faeaf221",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence": "apply->published threading built: publish --derived-from + lifecycle threads; commits 40b667f (myc)",
    "outcome": "implemented",
    "proposal_commitment": "9068b4888a6f5101778e9491364ac6627ca61a9cb3219d9ab0278ef98a329f28",
    "proposal_fqdn": "h.9068b4888a6f.proposal.myc.md",
    "resolver": "claude"
  }
}
```
