# Where myc sits — the federation

You may have arrived at this repository on its own. myc is **not** standalone: it
is one substrate of a four-part federated mycelium. This file is the map back.

## The four substrates

| substrate   | role                                                           |
| ----------- | -------------------------------------------------------------- |
| **omega**   | physics — a deterministic, integer-exact life kernel           |
| **liquid**  | latent intent — a phase-routed autopoietic substrate           |
| **myc**     | publication & audit — proposal lifecycle, witnesses, finality (here) |
| **trinity** | coordination — the signed chord ledger and the court           |

Each has its own authority; the value is in their composition under shared
invariants, not in any one alone. `trinity` is the meta-layer that binds them:
the Ed25519 voice registry, the hex-coordinate organ topology, and the external
verification court.

## What is shared

- **One voice registry.** A signature made by a voice verifies identically in
  every substrate. Amending that registry requires a real 3-of-5 keyed-voice
  quorum (`trinity`'s `t registry-amend`), enforced against out-of-band edits.
- **One licence stance.** All four repos are AGPL-3.0-or-later.
- **One law.** The substrates agree on a single canonical law hash; disagreement
  is a detectable fault, not a silent drift.

myc's particular role is the **membrane**: it is where a commitment becomes
publicly resolvable and auditable by hash. The other substrates publish through
it; a stranger verifies through it — always by re-deriving from bytes, never by
trusting a host.

## Verify the federation without trusting it

From `trinity`, a stranger runs one command — no clone, read-only network,
nothing of ours but public bytes — and re-derives the four substrates' agreement
from raw bodies. The verifier lives at
`trinity/probes/external-trust-verifier-v0/court.ts`.

## Pointers

- Coordinated by **trinity** — the chord ledger, `GOVERNANCE.md`, and the
  coordinate decoder live there.
- myc's own entry points: `README.md`, `AGENTS.md`, `MYC.md`, `llms.txt`.

The code is forkable under AGPL. What a fork cannot silently take is the
federation's legitimacy: key continuity, the quorum-gated registry, the signed
provenance ledger, and live resolution.
