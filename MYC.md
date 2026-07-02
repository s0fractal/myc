---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7"]
energy: 0.7
mode: "OBSERVE"
tension: "root-namespace-descriptor"
confidence: "medium"
receipt: "file"
---

# MYC Root Descriptor

This file describes the local `myc` namespace.

```yaml
namespace:
  fqdn: "myc.md"
  local_root: "~/myc"
  status: "draft"
  owner_hint: "s0fractal"
  default_visibility: "descriptor-public-payload-private"

policies:
  payload_retention: "do-not-copy-by-default"
  raw_resolution: "descriptor-first"
  naming: "computed-after-capture"
  global_descriptor_usefulness: "must-not-require-private-payload"
  local_global_binding: "symlink-or-capability-descriptor"
  public_private_split: "public-descriptor-private-payload"
  proof_modes:
    - deterministic
    - witnessed
    - sealed

substrates:
  genesis: "~/Genesis"
  liquid: "~/liquid"

layers:
  public: "~/myc/public"
  private: "~/myc/private"
  sealed: "~/myc/sealed"
```

## Meaning

`myc.md` is not one site and not one repo. It is a namespace for descriptors,
protocols, lenses, recipes, proofs, and projections that may later be published
through DNS, IPFS, Radicle, local files, Google Drive, or other stores.

The public name should not imply public payload ownership.

## Local To Global Binding

Local tools and stores may be connected through symlinks or descriptors:

```text
private/links/codex  -> ~/.codex
private/links/gemini -> ~/.gemini
private/links/drive  -> Google Drive mount
```

These links are local implementation details. Public artifacts should reference
commitments, capabilities, receipts, and witness records instead of leaking
local paths or payloads.

The preferred external behavior is:

```text
prove/function without revealing full why
```

That means a descriptor may prove existence, observation, routing, naming, or
materialization while keeping private context and private payload access sealed.
