---
chord:
  primary: "oct:7.2"
  secondary: ["oct:6.4", "oct:5.1"]
energy: 0.72
mode: "OBSERVE"
tension: "transformation-descriptor-schema"
confidence: "medium"
receipt: "file"
---

# Transformation Descriptor Schema

A transformation descriptor is a first-class edge in the MYC graph.

It describes how one or more input commitments became one or more output
commitments through a function, context, and params.

```yaml
transformation:
  fqdn: "transform.forward.classify.s0fractal.h.<raw-short>.myc.md"
  step: "canonicalize | classify | name | project | other"
  direction: "forward | retrospective"
  proof_mode: "deterministic | witnessed | sealed"
  actor: "s0fractal | codex | gemini | local | unknown"

  input:
    - role: "raw | intent | naming-proof | artifact | payload | other"
      fqdn: "optional-fqdn"
      commitment: "hash-or-null"

  function:
    fqdn: "h.<hash>.<name>.function.myc.md"
    commitment: "hash"
    determinism: "deterministic | witnessed | sealed | unknown"

  context_commitment: "hash"
  params_commitment: "hash"

  output:
    - role: "raw | intent | naming-proof | artifact | other"
      fqdn: "optional-fqdn"
      commitment: "hash-or-null"

  receipts: []
```

## Direction

`forward` means the transformation was part of the original capture/projection
path.

`retrospective` means a later lens was applied to an older input. The old object
is not rewritten; a new transformation edge is added.

## Rule

Knowledge is useful, but the graph is made of transformations.

The protocol should preserve both:

```text
what exists
how it became visible
```
