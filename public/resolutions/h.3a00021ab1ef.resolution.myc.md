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
  sig: "96cgFEFr+3onX1FqvKmxeOaSkInfRupIhyI5mt2Mm28UgnHcWwhogW0gCDOoWT71I2sse0KwswhDE/b2iVNjDg=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.1bd456e1f3be.proposal.myc.md`
- **resolver**: `s0fractal` (sign to make it count toward finality)
- **evidence**: 1 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.3a00021ab1ef.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "3a00021ab1ef6e960ef743a1b14e071730c618b66c4d46608b8f7cdbed08f711",
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
    "resolver": "s0fractal"
  }
}
```
