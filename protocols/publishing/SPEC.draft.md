---
chord:
  primary: "oct:7.2"
  secondary: ["oct:5.5", "oct:6.4"]
energy: 0.85
mode: "OBSERVE"
tension: "publishing-spec-draft"
confidence: "high"
receipt: "file"
---

# Publishing And Consensus (Phase 8)

MYC is a local-first protocol. By default, everything stays in the local
machine. Phase 8 defines how MYC safely publishes projections to the outside
world (IPFS, GitHub Pages, Cloudflare Workers, etc.) without leaking private
keys, local paths, or internal metadata.

## 1. The Publish Boundary

A `PublishDescriptor` is a proof that an artifact or a graph branch is ready for
the public.

To be published, an object must pass the **Publishing Gates**:

1. **Naming Proof**: It must have a human-readable FQDN bounded by a
   `NamingProofDescriptor`.
2. **Graph Verification**: It must have a valid verification receipt.
3. **No Private Payload Leakage**: The projection must not require a
   `private-local` payload to be understood by the verifier.
4. **Rollback Path**: The publisher must retain the transformation edge that
   created it, allowing a rollback if the consensus rejects it.

## 2. Redaction Policy

When a graph is exported, local paths and secrets must be stripped.

- `private-local` payload locators are scrubbed.
- `local_path` fields in `IntentDescriptor` addresses become `null`.
- Raw file system paths are never published.

## 3. Consensus Models

MYC does not enforce a single consensus model (like PoW or PoS). Instead,
consensus is treated as another layer of capabilities:

- **Discussion Threads**: Ephemeral objects linked to a published artifact.
- **Witness Signatures**: Remote verifiers append `SealedReceiptDescriptor`s to
  confirm they witnessed the object.
- **Resonance Ranking**: Autonomous agents (like JAZZ daemons) can assign
  energy/tension scores to published graphs.

## 4. Export Formats

The standard export is an `ndjson` stream containing only:

- `FunctionDescriptor`
- `TransformationDescriptor`
- `IntentDescriptor`
- `PublishDescriptor`
- `RawDescriptor` (with public payload only or redacted payload locators)

Any descriptor with `payload_policy: "private"` will have its payload completely
excluded from the stream.
