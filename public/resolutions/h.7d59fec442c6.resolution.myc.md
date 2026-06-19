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
  sig: "EC5Q2kfrmmMY3l/NEHw/qLcFUQJscl1gOatgH2smIl759TAyfZYj+7wffOAopijWUw8UnP91vXte/ARXTCUcBQ=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.1bd456e1f3be.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.7d59fec442c6.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "7d59fec442c6147e24eebad4b71c78420738550ef1c31d69c1ad959a2d0b984c",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "5aa7096704e2a22795901172991d1b77ded3620dd722c5cbe1322703176ad71c",
        "kind": "chord",
        "ref": "x5d00_954460_codex_a1-write-capability-attenuation-v1"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "1bd456e1f3be933aa755cd64c851bee3d3c9b35a37ac8c112d3d23ccfe61e044",
    "proposal_fqdn": "h.1bd456e1f3be.proposal.myc.md",
    "resolver": "claude"
  }
}
```
