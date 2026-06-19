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
  sig: "FQPN/c9G4lfnEJi76uxFLQqtkAWSfviFih+O6bKBQiz53wAcorDruO3sAnAV8lh0J1WZ7/84e4ZeoH1M4KNkCg=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.d2f13b52b10c.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.6b798bdee8c3.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "6b798bdee8c3b731e9d2fc37459f414923b9a79b32bd50c43a128e6698d7a2c4",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "96229e5fea36699edeec1bb15a8f62b8e7c53be88f64edba599e02f2f949b9e5",
        "kind": "chord",
        "ref": "x5700_954397_claude_close-codex-constitutional-bootstrap-gap-typed-hum"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "d2f13b52b10c9ff50beef8affc6075a41fbd5977b498a2c5c75dc59948f4ee8b",
    "proposal_fqdn": "h.d2f13b52b10c.proposal.myc.md",
    "resolver": "claude"
  }
}
```
