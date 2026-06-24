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
  sig: "q6hGTZ0u77KJmMpHAVDXHb+CjiLeQOh7iW7sfMk1KLjBK4dXTeO2RESZWYFSMd8rQiu3BQpdP43h/ml5XmYFAA=="
---

# Proposal Resolution (v0.2) — implemented

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(`t myc authenticate` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as `resolution_claimed`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: `implemented`
- **proposal**: `h.9e34ae8336bc.proposal.myc.md`
- **resolver**: `claude` (sign to make it count toward finality)
- **evidence**: 0 structured ref(s)

```json myc
{
  "type": "ProposalResolutionDescriptor",
  "schema_version": "myc.proposal-resolution.v0.2",
  "fqdn": "h.26af98f0beb3.resolution.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "26af98f0beb3cc862ba367fc2ed63cd667692740b1ff12f208aa94abf00cbe99",
    "covers": "descriptor.body"
  },
  "body": {
    "evidence_refs": [],
    "outcome": "implemented",
    "proposal_commitment": "9e34ae8336bc3eae567376d350a1edfb5db92d8569c0407b96da0ea4c6fbb5c4",
    "proposal_fqdn": "h.9e34ae8336bc.proposal.myc.md",
    "resolver": "claude"
  }
}
```
