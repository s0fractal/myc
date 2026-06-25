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
  sig: "sBX2tMNTYQmtZ+7yjDAx1sBTZX1fo8q3j/XL25xPWqX4iXmA1H9MlFBCW20SN58vT6Y8ZHtMWJBcBWo2WbdzAw=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.3b418ab2dd66.proposal.myc.md`
- **resolver**: `codex` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.bda4ec6e3e40.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "bda4ec6e3e40ca3183c9fa6e883a00bd5b2e7030c3132d6689710ec663e816a3",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [
      {
        "commitment": "8feacf42d878b293edb91d45fcbfe57a29afb24138f03457245ef2325e4ccdbb",
        "kind": "chord",
        "ref": "x7700_955314_codex_human-to-advisor-mandate-model-quorum"
      }
    ],
    "outcome": "implemented",
    "proposal_commitment": "3b418ab2dd66627c3e7624611f5e465b392e4f1844cd92836075a31c1f3447e0",
    "proposal_fqdn": "h.3b418ab2dd66.proposal.myc.md",
    "resolver": "codex"
  }
}
```
