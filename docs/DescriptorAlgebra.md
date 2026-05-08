---
chord: ["oct:2.4", "oct:6.2"]
energy: 1.0
tension: "Formal specification of descriptor algebra and idempotent projections in MYC."
---

# Descriptor Algebra Specification

## Context & Motivation

The `myc` repository serves as the public consensus ledger (the "Hologram") for
the OMEGA-64 swarm. It operates on a strict **Empty Center** philosophy: there
is no database. Instead, state is derived through deterministic projection of
plain-text Descriptors (Markdown with specific Frontmatter).

To ensure that the public graph never diverges, we must formalize the
**Descriptor Algebra**: the mathematical rules governing how multiple
descriptors combine, override, or nullify one another to form the `graph.ndjson`
and `index.ndjson` topologies.

## Axioms of the Algebra

1. **Idempotence ($P \circ P = P$)** Applying a projection function $P$ to the
   same set of Descriptors any number of times must yield the exact same output
   Graph $G$.
   - Re-running `deno task myc verify-projections` must produce zero changes if
     the underlying files have not changed.
   - Re-importing the same `PHI_RECEIPT` into a `PN_CAD_DESCRIPTOR` must produce
     a file with an identical SHA-256 hash.

2. **Commutativity ($A + B = B + A$)** The order in which descriptors are read
   from the filesystem must not affect the final Graph.
   - All aggregations must sort by a deterministic property (e.g.,
     `<timestamp>_<hash>`) before applying reductions.

3. **Associativity ($(A + B) + C = A + (B + C)$)** Merging sub-graphs must yield
   the same result as projecting the entire graph at once.

## Descriptor Transformations

Let $D$ be a Descriptor (a Markdown file). Let $T$ be a Transformation Function
(e.g., `transform.forward.classify`).

$T: D \to \{Edge, Node\}$

### The Override Rule (Temporal Dominance)

If two Descriptors $D_1$ and $D_2$ assert the same edge (e.g., an intent
classification) for the same node, the one with the higher epoch/timestamp
strictly overrides the other.

- $T(D_1 \cup D_2) = T(D_{latest})$

### The Nullification Rule (Tombstoning)

A descriptor expressing a `DELETE` intent ($\emptyset$) explicitly nullifies any
prior descriptor matching its target hash.

- $T(D_{assert} \cup D_{delete}) = \emptyset$

## Receipt Integration

When a `PHI_RECEIPT` from `liquid` is imported into `myc`:

1. It is deterministically hashed.
2. It generates a single Node $N_{receipt}$ and at least two edges:
   - $E_{origin}$: Linking the receipt to the original `PHI_INTENT`.
   - $E_{phase}$: Linking the receipt to the `Genesis` phase signature.

These edges are immutable. Any attempt to modify a receipt descriptor alters its
file hash, invalidating its cryptographic binding to the `Genesis` kernel.
