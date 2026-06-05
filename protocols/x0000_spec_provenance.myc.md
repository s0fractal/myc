---
type: VectorDocumentDescriptor
status: draft
coordinate: x0000
schema_version: myc.vector-document.v0.1
fqdn: x0000_spec_provenance.myc.md
description: "Specification for coordinate routing and cryptographic provenance in subjective mycelium files"
---

# x0000: Subjective Mycelium Provenance Bridge

This document specifies the routing, naming conventions, and cryptographic validation bridge for simplified, coordinate-addressed Mycelium documents (`xNNNN_*.myc.md`).

## 1. Coordinate Routing (`xNNNN`)

Every document in the subjective mycelium follows a flat-coordinate addressing convention:
* **Format:** `xNNNN_name.myc.md` (or `xNNNN_name.md`), where `x` is the coordinate prefix and `NNNN` represents a 4-digit hexadecimal identifier representing the logical "organ" coordinate.
* **Resolution Rule:** When looking up a target FQDN starting with `xNNNN`, the resolver recursively scans the workspace (including `src/`, `public/`, `protocols/`, etc.) for a matching filename.
* **Fallback:** If multiple files share the same coordinate, the resolver prioritizes the one explicitly matching the requested FQDN.

## 2. Cryptographic Provenance Bridge

To prevent identity spoofing and payload tampering while allowing files to reside in arbitrary unencrypted folders (e.g. Google Drive, Desktop), files can include a `provenance` section in their YAML frontmatter.

### Frontmatter Schema

```yaml
---
type: VectorDocumentDescriptor
coordinate: x8888
fqdn: x8888_antigravity_memory.myc.md
provenance:
  signature: "0x3044022055ae7..."
  signer: "antigravity"
  commitment: "sha256:d82f..."
  parent_receipt: "public/verification/x3000_receipt.myc.md"
---
```

### Canonical Commitment (the one schema all implementations share)

The commitment binds the document's **name and content** together:

```text
commitment = "sha256:" + hex( SHA-256( fqdn + "\n" + body.trimEnd() ) )
```

- `fqdn` — the document's full coordinate name, e.g. `x8888_antigravity_memory.myc.md`.
- `body` — the document content AFTER the closing frontmatter `---` (the whole
  text if there is no frontmatter), with trailing whitespace removed (a final
  newline or stray spaces are not semantic content).

**Why both, and not one or the other** — section 2 states two goals, and each
half answers one:

- Binding `body` defeats **payload tampering** (goal 1). A *frontmatter-only*
  commitment misses this: the body could be rewritten and still "verify".
- Binding `fqdn` defeats **identity spoofing** (goal 2). A *content-only*
  commitment misses this: a validly signed body could be replayed under a
  different coordinate and still "verify".

Mutable metadata (`status:`, and the `provenance` block itself, which cannot
hash its own value) is deliberately NOT covered — a draft becoming final must not
invalidate the proof, only a change to the name or content may.

**Conformance vector** (any implementation MUST reproduce this exactly):

```text
fqdn       = x0000_conformance.myc.md
body       = "# Conformance Vector\n\nThis body is the canonical commitment input.\nName + content are bound; mutable frontmatter is not.\n"
commitment = sha256:0cd0ac37654f234bde63ddb72ca3ff3920ed0fa5d2602d07221528b7b2a0d875
```

The CLI resolver (`src/x0200_resolve.ts`, `canonicalCommitment`) is the reference
implementation, locked to this vector by `src/x0200_resolve_test.ts`. The PWA
worker reimplements the same algorithm in browser JS (different runtime) and must
reproduce the vector.

### Validation Algorithm

When a reader/viewer (PWA or daemon) encounters a document with a `provenance` block:
1. **Commitment Check:** The viewer recomputes the canonical commitment above
   (over `{fqdn, body}`) and compares it with `provenance.commitment`.
2. **Signature Verification:** The viewer verifies `provenance.signature` against the signer's public key (retrieved from their voice profile, e.g., `x8A16_voice_antigravity.myc.json`).
3. **Receipt Trail:** If `provenance.parent_receipt` is provided, the viewer resolves the referenced receipt descriptor and validates its cryptographic witness tree.
4. **Visual Indicator:** If all checks succeed, the PWA renders a **Verified Provenance** green badge. If any check fails, it raises a security warning.
