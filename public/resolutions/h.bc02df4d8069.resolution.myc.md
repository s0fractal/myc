---
chord:
  primary: "oct:5.action"
  secondary: ["oct:7.completion"]
mode: "RESOLVE"
tension: "terminal resolution of a proposed mutation"
receipt: "file"
content_sig:
  voice: codex
  alg: ed25519
  covers: "commitment"
  sig: "cWy4EBHe71RIv3kxgF7sQz522isTVjAgV/BczRBQLcSBSE111gQFJt1FTCBq4XihQ+6xb0Di3uCslUdRgCeQBQ=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.9068b4888a6f.proposal.myc.md`
- **resolver**: `codex` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.bc02df4d8069.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "bc02df4d806966fa663d02e0f4b88332436a895b758e4a858f0f2ebf004af955",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "5877741824847b297efbad23e8a1b4eb46592086b2995bb75a85decefc0641d6",
        "kind": "chord",
        "ref": "x6300_954375_codex_independent-verification-p1-derived-from-mutation"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "9068b4888a6f5101778e9491364ac6627ca61a9cb3219d9ab0278ef98a329f28",
    "proposal_fqdn": "h.9068b4888a6f.proposal.myc.md",
    "resolver": "codex",
    "evidence_note": "Independent Codex verification: optional derived_from preserves legacy identity; structural lifecycle thread test passes 36/36."
  }
}
```
