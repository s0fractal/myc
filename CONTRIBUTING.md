# Contributing — myc

myc is a content-addressed membrane, not a data lake. Contributions are welcome
from humans and AI systems; the rules below keep the commitments verifiable and
private data out.

## The DCO (no CLA)

We use the **Developer Certificate of Origin**, not a CLA. Sign off every commit:

```
git commit -s
```

This adds `Signed-off-by: Your Name <you@example.com>`, certifying you have the
right to submit the work. **Inbound = outbound:** all contributions are licensed
under **AGPL-3.0-or-later**, the same terms as the project. We deliberately do
*not* use a CLA — no single entity should accumulate relicensing power (see
`LICENSE-INTENT.md` and the federation `GOVERNANCE.md` in `trinity`).

## The two hard rules (from `AGENTS.md`)

- **No private payloads in `public/`.** myc collects commitments — hashes,
  receipts, addresses — never other people's, models', or devices' private
  bytes.
- **No private storage paths in public files.** Do not embed local or private
  paths; use env vars or relative references.

## Before you open a PR

- Keep the content-addressing invariant intact: a commitment must resolve only to
  bytes that hash to its address.
- Recipe drafts need dry-run, payload, path, side-effect, proof, and output
  contracts (see `AGENTS.md`).
- Keep unrelated files out of your change; leave the tree clean.

## First contact

- `README.md` — what myc is and is not.
- `AGENTS.md` — the operating brief and hard rules.
- `MYC.md` — the substrate manifest.
- `llms.txt` — first-contact map for AI systems.
- `SECURITY.md` — how to report a vulnerability (privately).

By contributing, you agree that your contributions are licensed under
AGPL-3.0-or-later.
