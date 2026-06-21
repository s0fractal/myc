# Licensing intent — myc

> This document records the _reasoning_ behind the licence choice. It is not
> itself a licence. The legally binding terms live in `LICENSE` and `NOTICE`.
> This file is for human readers, contributors, and a future draftsperson of a
> mycelium-aware bespoke licence. It is the sibling of `omega/LICENSE-INTENT.md`;
> the federation shares one licensing stance.

## Current state (2026-06-21)

- **License**: GNU Affero General Public License v3.0 or later
  (`SPDX-License-Identifier: AGPL-3.0-or-later`).
- **Status**: interim, chosen as a stopgap, matching the rest of the federation.
- **Visibility**: being prepared for public release. The licence is applied so
  that _if and when_ the repo is shared, the legal frame is unambiguous. Private
  implementation details (`private/**`) and sealed payloads (`sealed/**/*.secret`
  etc.) are kept out of the tree by `.gitignore` by design.

## What we are trying to protect

myc is not a standalone product. It is one of three federated substrates
(`omega`, `liquid`, `myc`) plus a meta-coordination layer (`trinity`). Each
substrate has its own authority:

- `liquid` may generate latent intent.
- `omega` may accept or reject bounded deterministic transitions.
- `myc` may publish and audit receipts (proposal lifecycle, witnesses, finality).

The _value_ of any one substrate alone is small. The value of the federation —
substrates composing under shared invariants — is large. The licence must
therefore protect the **federation**, not just myc's source.

## Why AGPL-3.0-or-later as the stopgap

AGPL is the closest _existing_ license to that intent:

1. **Network-use copyleft (§13).** Anyone running a modified myc as a network
   service must publish their modifications. This blocks "fork-and-host as closed
   SaaS" extraction — the most likely capture vector for substrate infrastructure.
2. **Derivative-works copyleft.** Downstream substrates built on myc must stay
   open under compatible terms, preserving the "mycelium" composability property.
3. **Permissive enough for research.** Academic study, personal experiments, and
   independent audit are all unambiguously allowed.
4. **Disliked by closed-shop enterprises.** A feature, not a bug — those who would
   integrate myc into closed products self-select away; substrates that want to be
   part of the mycelium self-select in.

## Why this is _only_ a stopgap

AGPL was written for traditional software (one program, one network service, one
corporate owner). It says nothing about substrate federation, the authority each
substrate holds, or content-addressed provenance as the unit of trust. A bespoke
mycelium-aware licence is on the roadmap; until it is drafted and adopted,
AGPL-3.0-or-later is the honest interim frame.

## Note on authorship

myc is co-authored by human and model voices (the federation's chord record is the
provenance log). Copyright is held by `s0fractal`; the model voices contribute as
accountable participants, not as separate rights-holders. This mirrors the rest of
the federation.
