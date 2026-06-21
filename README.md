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

## The Membrane — one surface onto the body

`myc` is the **membrane** of a four-substrate body: the single surface through
which models and humans see its proofs, graphs, and fractals — and propose
changes to it. Every command below is reachable from the trinity superproject as
`t myc <command>` (read surfaces run read-only; mutating ones need explicit
write).

```bash
t myc membrane     # THE surface: the body + its trust + its mutations, composed
t myc organism     # the four substrates as one body, with each one's proof-kind
t myc trust        # resonance projection — integrity-verified trust per published node
t myc lifecycle    # one vocabulary: proposed → applied → published → … → resonant
t myc effects      # the typed capability (read | effect | serve) of every verb
t myc coord <xNNNN> [--lattice|--why|--graph]   # provability of any graph node
```

**Trust is a spectrum.** A node can be true-by-physics (omega), stable-by-resonance
(liquid), agreed-by-quorum (trinity), existent-by-provenance (myc), or
deterministic-by-apply (SPORE). The membrane makes every kind legible in one
graph, fractally zoomable down to four roots (Bitcoin Genesis · phase law · voice
keys · content hash), and it never hides where trust is missing.

**Every proposal is a spore.** A mutation is proposed into the membrane as a
content-addressed, unsigned, **dormant** descriptor — it carries no trust until it
germinates through the witness/publish flow:

```bash
t myc propose --text "<change>" --requires <omega|liquid|trinity|spore> --actor <you>
```

`trust` verifies **integrity** (each descriptor binds its body; witnesses/reviews
join by commitment identity), not yet **authenticity** (signed descriptors await
key custody). Unverified spores stay visible and dormant; they are never deleted.

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

`deno task myc demo` runs the full capture pipeline and prints the resolved
`task.s0fractal.h.<hash>.myc.md` address for the demo text. The raw payload is
stored locally under the private layer and is verified by hash, but public
descriptors do not embed the payload bytes.

## Coordinate Resolver (`deno task resolve`)

Alongside the content-addressed `h.<hash>` family, the substrate graph is a flat
coordinate space — a **neuron-graph** with two kinds of node: chords
(`xNNNN_name.myc.md`) and organs (`xNNNN_name.ts`). A name is a **resolvable,
provable link** — give the resolver a coordinate and it finds the file ANYWHERE
in the local graph (rooted at the git superproject, so one address space spans
this repo and every sibling substrate) and tells you how trustworthy it is by
either of two independent proof modes:

```bash
deno task resolve x0000_spec_provenance          # find + prove a node
deno task resolve x0000.HOW-TO.myc.md --cat      # also print its content
deno task resolve --why x0000_spec_provenance    # the node's provable CAUSAL chain
deno task resolve --graph x0000_spec_provenance  # local topology: causes ↑ effects ↓
deno task resolve --lattice                       # WHOLE graph: proven/unproven + dangling links
deno task resolve --stamp s0fractal x0000_...     # write a crypto provenance block
deno task resolve x0000_... --json               # machine-readable (LLM-friendly)
```

- **📜 git** — the commit trail IS the witness: author, date, and the INTENT (the
  commit message). Runs in the file's own repo, so submodule history is correct.
- **🔐 crypto** — a `provenance` block whose commitment canonically binds
  `{fqdn, body}` (sha256) — so a signed body cannot be replayed under a different
  coordinate; tamper-evident. `--stamp` creates it; resolve verifies it. Works
  for files anywhere (Drive, Desktop, future p2p), outside any repo.

A node is **proven** if EITHER mode validates. `--why` resolves not just the node
but its causes (`hears:`/`references:`/`closes:` + the git intent), and **each
causal step is itself a resolved, proven node** — so the graph can show not only
what it holds but the verifiable path that produced it, walkable from any node.
`--graph` shows a node's local topology in BOTH directions, with kind-aware edges:
a chord shows `↑ caused by` / `↓ feeds into` (its causal `hears:` neighbours); an
organ shows `↑ built from (imports)` / `↓ used by (imported by)` (its composition
neighbours). Cross-kind edges resolve too — a chord that cites an organ appears in
that organ's "used by". Each neighbour is itself resolved and proven, so you can
walk the lattice from any point and verify every step.

`--graph` walks from a node; `--lattice` takes in the WHOLE neuron-graph at once —
node count split by kind (chords / organs), proven vs unproven (📜 git / 🔐
crypto), edges split by kind (causal `hears:` / composition `import`s), orphans
(no edge of either kind), the hub (most-connected node), and the DANGLING
citations: a `hears:`/`references:` that resolves to no node — the wiki's broken
links. The topology does not hide where trust is missing. (The lightweight import
scan feeds the graph view; trinity's `x6020_gravity` remains the authoritative
import/gravity-law analyzer.)

> Canonicalization note: the commitment covers `{fqdn, body}`, binding the name
> to the content. The PWA worker now commits the same scheme
> (`covers: "fqdn + body"`, see `sites/myc.md/worker.ts`), so the CLI and the
> browser agree on one provenance schema — conformance-locked by
> `src/x0200_resolve_test.ts` against the `x0000_conformance.myc.md` vector.

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
  resolver/          # Read-only resolver response contracts
  jazz/              # Anti-orchestration protocol drafts
  recipes/           # Phase 4 recipe design checkpoint, execution disabled
  capabilities/      # Phase 5 authority drafts, descriptors disabled
  sealed/            # Phase 5 receipt drafts, descriptors disabled
public/              # Publishable descriptors and projections
  transforms/        # First-class transformation edges
  verification/      # Graph-level verification notes
private/             # Local-only links, capabilities, private context
sealed/              # Commitments/proofs without public payload
src/                 # Local resolver/capture CLI + audit (flat-src coord-bearing organs)
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
deno task myc verify-projections
deno task myc adapter-dry-run genesis
deno task myc availability <fqdn>
```

Resolver endpoints include:

```text
GET /availability?target=<path-or-fqdn>
GET /adapter-dry-run?adapter=<name>
GET /verification
GET /verify-projections
GET /verification-source?name=<receipt.md>
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

## License & attribution

**Licence**: GNU Affero General Public License v3.0 or later
(`SPDX-License-Identifier: AGPL-3.0-or-later`). See [LICENSE](LICENSE) for the full
text and [NOTICE](NOTICE) for the copyright header.

This is an **interim stopgap**. myc is one substrate in a federated mycelium
(`omega`, `liquid`, `myc`, coordinated through `trinity`); the licence aims to
protect the federation from extractive forks while permitting study, modification,
and independent audit. A bespoke mycelium-aware licence is on the roadmap; the
reasoning is recorded in [LICENSE-INTENT.md](LICENSE-INTENT.md). `private/**` and
sealed payloads are kept out of the repository by `.gitignore`.
