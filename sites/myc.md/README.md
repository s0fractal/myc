---
chord:
  primary: "oct:4.0"
  secondary: ["oct:3.7", "oct:6.4"]
energy: 0.73
mode: "OBSERVE"
tension: "local-first-resolver-site-vision"
confidence: "medium"
receipt: "file"
---

# myc.md Local-First Site Vision

`myc.md` should not be designed as a classical global website where the server
is the source of truth.

It should be designed as a local-first resolver shell: a public entry point that
loads enough interface, verification logic, and protocol vocabulary to let each
observer resolve the graph through their own local rights, stores, and lenses.

The global site is the shared language. The local node is the deeper world.

## Core Idea

```text
global myc.md
  -> HTML shell
  -> PWA/service worker
  -> descriptor verifier
  -> resolver UI
  -> local resolver registry
  -> observer-specific projections
```

The same FQDN can produce different valid projections depending on the observer:

```text
anonymous web user -> public descriptor only
owner browser      -> descriptor + local private links + capabilities
trusted peer       -> descriptor + selected sealed receipts
model daemon       -> descriptor + allowed context chain
```

This is not inconsistency. It is observer-aware resolution.

## What The Site Publishes

The public layer may publish:

- descriptors
- lenses
- recipes
- naming proofs
- witness chains
- selected artifacts
- selected payloads
- unavailable reasons
- capability request pages

It must not imply that every known object is publicly retrievable.

The key invariant:

```text
FQDN resolves to a descriptor, not necessarily to data.
```

## Local Resolver Sources

The richer local projection may draw from:

```text
fs://~/myc
codex://~/.codex
gemini://~/.gemini
drive://...
ipfs://...
rad://...
p2p://...
sealed://~/myc/sealed
```

The public site should not expose these local paths. It should use descriptors,
commitments, capabilities, and receipts.

## Implementation Options

### PWA Shell

A PWA can cache descriptors, run verification code, render lenses, and maintain
an offline-first local graph.

Limitation: browsers cannot freely read `~/.codex`, `~/.gemini`, or arbitrary
local files without explicit user grants or helper software.

### Local Companion Daemon

A local daemon can expose a narrow resolver API to the PWA:

```text
http://127.0.0.1:<port>/resolve?fqdn=...
```

The daemon can safely bridge local files, model CLIs, Google Drive, IPFS, and
Radicle while enforcing capability and retention policies.

This is the most practical first implementation.

The current draft CLI already exposes the intended read-only shape:

```text
GET /health
GET /index
GET /resolve?fqdn=<fqdn>
GET /verify?target=<path-or-fqdn>&private=1
GET /verify-graph
GET /lineage?target=<path-or-fqdn>
GET /explain?target=<path-or-fqdn>
```

### Browser Extension

An extension can add stronger local resolver powers directly in the browser. It
can decode FQDNs, inject lenses, and route capability requests.

This is powerful, but the security model and distribution are more complex.

### Desktop Wrapper

A Tauri or Electron wrapper can provide the strongest local integration. It is
less web-native, but may be useful for owner/operator workflows.

## Views

- latest protocol projections
- immutable hash views
- observer lenses
- naming proofs
- witness chains
- capability request pages
- private-unavailable descriptors
- local resolver status
- sealed proof inspection
- recipe execution dry-runs
- context-chain timelines

## Security Shape

`myc.md` should support three kinds of "why":

```text
public why   -> explanation, public receipt, deterministic proof
private why  -> local prompts, sessions, capabilities, private payload locators
sealed why   -> hash, signature, encrypted receipt, ZK proof, witness
```

The system should be able to function and prove enough without revealing the
full private cause.

## First Useful Prototype

1. Static `myc.md` shell that loads descriptor files.
2. Local companion daemon with read-only `resolve(fqdn)` and `verify(hash)`.
3. Descriptor cache for `~/myc/public` and `~/myc/sealed`.
4. Manual opt-in link grants for private sources.
5. UI views for public descriptor, local projection, provenance, and unavailable
   reasons.
6. Graph view for transformation lineage and retrospective projections.

The prototype should avoid model execution and materialization at first. It
should prove that local/global resolution and privacy boundaries are coherent.
