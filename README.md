---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:7.2"]
energy: 0.74
mode: "OBSERVE"
tension: "myc-root-draft"
confidence: "medium"
receipt: "file"
---

# myc

`myc` is a local draft space for content-addressed thought, protocol drafts,
semantic addresses, and substrate adapters.

This directory is not a data lake. It should not collect payloads that belong to
other people, models, devices, or private stores. It should collect commitments,
descriptors, receipts, routes, naming proofs, and projections.

The global development path is tracked in [ROADMAP.md](./ROADMAP.md).

## Core Formula

```text
artifact = function_hash(input_commitment, context_commitment, params_commitment)
```

The input does not have to be public bytes. It can be a descriptor of private,
encrypted, remote, expired, witness-only, or capability-gated payload.

## First Executable Cycle

The first working loop is intentionally small:

```text
raw text
  -> SHA-256 commitment
  -> RawDescriptor
  -> TransformationDescriptor(canonicalize)
  -> deterministic rule classifier
  -> IntentDescriptor
  -> TransformationDescriptor(classify)
  -> NamingProofDescriptor
  -> TransformationDescriptor(name)
  -> ArtifactDescriptor
  -> TransformationDescriptor(project)
  -> resolver index
  -> graph edges
```

Run it with:

```bash
deno task myc capture --text "зроби маленький тест" --actor s0fractal
deno task myc resolve task.s0fractal.h.<hash>.myc.md
deno task myc verify task.s0fractal.h.<hash>.myc.md
deno task myc verify-graph
deno task myc lineage task.s0fractal.h.<hash>.myc.md
deno task myc explain task.s0fractal.h.<hash>.myc.md
```

The demo object currently resolves at:

```text
task.s0fractal.h.38bfd1d80cb9.myc.md
```

Its raw payload is stored locally under the private layer and is verified by
hash, but public descriptors do not embed the payload bytes.

## Local Checks

Run the full local verification loop:

```bash
deno task check
```

The repository includes a tracked Git hook in `.githooks/pre-commit`.

Enable it in a checkout with:

```bash
git config core.hooksPath .githooks
```

The hook runs formatter check, TypeScript check, lint, tests, graph
verification, and protocol audit before commit.

The protocol audit is intentionally strict:

```bash
deno task audit
```

It blocks premature descriptor families, core function identity drift, public
payload leakage, and secret-like material in public files.

GitHub Actions runs the same command on pushes and pull requests:

```bash
deno task check
```

## Root Invariants

- Names point.
- Hashes commit.
- Receipts remember.
- Lenses project.
- Payload access is a capability, not an assumption.
- Public descriptors should keep working without private payload access.
- `*.raw.myc.md` means uninterpreted payload commitment, not necessarily stored
  bytes.
- FQDN resolves to a descriptor, not necessarily to data.
- A model response and a daemon-normalized artifact are different provenance
  layers.
- Local links can bind private tools and stores to global names without exposing
  their contents.

## Visibility Layers

`myc` separates what can be published, what must remain local, and what may be
verified without being revealed:

```text
public/    # descriptors, selected projections, naming proofs, public receipts
private/   # local-only links, capabilities, session context, private payload hints
sealed/    # commitments, encrypted receipts, witness proofs, unavailable reasons
```

This lets a global descriptor say that something exists, was observed, or was
transformed without forcing the observer to copy or disclose payloads that do
not belong to it.

## Why Layers

Not every cause belongs in the public graph.

```text
public why   -> explanation, receipt, reproducible proof, safe context
private why  -> local prompts, sessions, user state, tool history, private stores
sealed why   -> hash, signature, ZK proof, witness, encrypted receipt
```

The goal is to let artifacts function and be checked while preserving the right
not to reveal the whole causal background.

## Draft Layout

```text
protocols/
  jazz/              # Anti-orchestration protocol drafts
  recipes/           # Phase 4 recipe design checkpoint, execution disabled
  capabilities/      # Phase 5 authority drafts, descriptors disabled
  sealed/            # Phase 5 receipt drafts, descriptors disabled
public/              # Publishable descriptors and projections
  transforms/        # First-class transformation edges
  verification/      # Graph-level verification notes
private/             # Local-only links, capabilities, private context
sealed/              # Commitments/proofs without public payload
tools/               # First executable local resolver/capture CLI
substrates/
  ADAPTER_POLICY.md   # Required adapter authority contract
  genesis/           # Genesis adapter notes
  liquid/            # Liquid adapter notes
sites/
  myc.md/            # Future public projection / website notes
```

## myc.md PWA

`myc.md` is a local-first PWA shell. The global Cloudflare Worker only serves
the interface. It expects a local resolver:

```bash
deno task myc serve --port 8787
deno task myc adapter-dry-run genesis
```

Deploy the shell with:

```bash
deno task site:deploy
```

## Address Families

```text
h.<hash>.raw.myc.md
h.<hash>.photo.raw.myc.md
h.<hash>.message.s0fractal.raw.myc.md
latest.jazz.protocol.myc.md
h.<hash>.jazz.protocol.myc.md
review.codex.h.<hash>.jazz.protocol.myc.md
witness.gemini.people.h.<hash>.photo.raw.myc.md
h.<finalHash>.review.codex.h.<targetHash>.jazz.protocol.myc.md
```

Short human-readable names are allowed, but immutable claims should be backed by
hashes and naming proofs.
