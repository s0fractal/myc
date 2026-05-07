---
chord:
  primary: "oct:3.7"
  secondary: ["oct:6.4", "oct:5.1", "oct:7.2"]
energy: 0.82
mode: "OBSERVE"
tension: "minimal-jazz-spec-draft"
confidence: "medium"
receipt: "file"
---

# JAZZ Spec Draft

## 1. Objects

### Raw Descriptor

A raw descriptor is a commitment to uninterpreted payload.

It may contain bytes, but it does not have to. It can point to a private,
encrypted, remote, witness-only, or capability-gated payload.

### Function Descriptor

A function descriptor commits to a transformation. It can be deterministic code,
a frozen model, a prompt template, a policy, a classifier, a wrapper, or a
human-reviewed procedure.

### Artifact

An artifact is a produced projection with provenance.

```text
artifact = function_hash(input_commitment, context_commitment, params_commitment)
```

In markdown files, the machine-readable descriptor should live in a fenced JSON
block:

````text
```json myc
{ "...": "..." }
```
````

Human prose may surround the descriptor, but verifiers should treat the JSON
block as the local machine layer.

### Transformation Descriptor

A transformation descriptor is the graph edge:

```text
input --[function + context + params]--> output
```

It is more important than a static knowledge claim. A system can keep older
objects intact while adding newer retrospective transformations over them.

```yaml
direction: "forward | retrospective"
```

`forward` belongs to the original capture/projection path.

`retrospective` means a later lens transformed an older input without pretending
that the past object changed.

### Graph Verification

The graph verifier checks whether transformation descriptors are coherent with
the local descriptor set.

Minimum checks:

- every descriptor body hash matches its commitment
- every canonical descriptor FQDN is unique
- transformation function FQDN resolves to a `FunctionDescriptor`
- transformation function commitment matches the resolved function descriptor
- transformation input/output FQDNs resolve when present
- transformation input/output commitments match the resolved node keys
- generated `graph.ndjson` is fresh

Commitment-only inputs are allowed for private payloads. Commitment-only
non-payload references should be treated as warnings until the protocol has a
stronger private witness model.

### Naming Proof

A naming proof records how a human-readable FQDN was computed after capture.

### Receipt

A receipt records that some operation happened: command, file, test, witness,
signature, ledger append, or external capability check.

## 2. Proof Modes

```yaml
proof_mode: "deterministic | witnessed"
```

`deterministic` means another verifier can recompute the same output from the
same commitments and functions.

`witnessed` means the full path is recorded, but byte-for-byte recomputation is
not promised. Most live LLM calls start here.

## 3. Naming Direction

JAZZ names are computed after capture:

```text
raw_commitment
  -> canonicalizer@h.A
  -> classifier@h.B
  -> naming_policy@h.C
  -> fqdn_renderer@h.D
  -> fqdn
```

The FQDN is not the source of truth. It is a projection with a proof.

## 4. Response Provenance

`review.codex.h.<target>.jazz.protocol.myc.md` is a social address. It must not
hide wrapper work.

The artifact metadata should distinguish:

```yaml
actor:
  kind: "model"
  id: "codex"
  raw_output_hash: "h.raw-model-output"

wrapper:
  kind: "daemon"
  id: "jazzd"
  code_hash: "h.daemon"
  config_hash: "h.config"
  policy_hash: "h.policy"
  transform: "wrap | normalize | repair | reject | materialize"

artifact:
  relation: "review"
  target: "h.target"
  output_hash: "h.final"
```

## 5. Privacy Boundary

JAZZ should pass commitments and capabilities. It should not retain payloads
that do not belong to it.

Valid payload states:

```yaml
payload_state:
  - public-bytes
  - private-local
  - encrypted-blob
  - remote-capability
  - witness-only
  - expired
  - known-but-unavailable
```

Public descriptors must remain useful when private payload access is missing.
They can expose commitments, witness claims, allowed projections, and
unavailable reasons without exposing bytes.

```yaml
resolution:
  descriptor_public: true
  payload_available_to_requester: false
  payload_state: "remote-capability"
  unavailable_reason: "requires-owner-capability"
  safe_outputs:
    - "existence"
    - "hash-commitment"
    - "witness"
    - "naming-proof"
```

## 6. Local-Global Binding

JAZZ may bind local tools and stores to global descriptors through private
symlinks, local locators, and capability records.

Example local-only bindings:

```text
~/myc/private/links/codex  -> ~/.codex
~/myc/private/links/gemini -> ~/.gemini
~/myc/private/links/drive  -> Google Drive mount
```

These links must not be treated as public FQDN targets. They are resolver inputs
for a local node.

JAZZ should distinguish three kinds of cause:

```yaml
why:
  public:
    - "receipts"
    - "safe explanations"
    - "deterministic proofs"
  private:
    - "prompts"
    - "sessions"
    - "local tool state"
    - "private payload locators"
  sealed:
    - "hash commitments"
    - "signatures"
    - "encrypted receipts"
    - "zk proofs"
```

The protocol should allow artifacts to function globally while revealing only
the minimum needed cause.

## 7. Minimal Daemon Contract

A daemon may:

- capture raw input
- compute hashes
- assign session and context chain IDs
- classify using configured policies
- route to listeners
- store raw model output
- normalize protocol wrappers
- verify schema and receipts
- append ledger events
- materialize only within explicit policy

A daemon must not:

- silently copy private payloads
- claim model authorship for daemon edits
- materialize code without a receipt path
- treat absence of response as failure
- force every listener to speak
