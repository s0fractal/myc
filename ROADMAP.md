---
chord:
  primary: "oct:7.2"
  secondary: ["oct:5.1", "oct:6.4", "oct:4.0"]
energy: 0.84
mode: "OBSERVE"
tension: "global-myc-roadmap"
confidence: "high"
receipt: "file"
---

# MYC Roadmap

MYC develops as a local-first protocol for honest transformations of thought,
not as a feature-heavy knowledge base.

The global direction:

```text
verify-first
local-first
transformation-first
payload-private-by-default
publish-as-projection
```

The core object is not "knowledge". The core object is a verified transformation
of commitments:

```text
input --[function + context + params]--> output
```

## Operating Principles

- Keep the core small enough that another model can audit it in one pass.
- Every new feature must add a verification surface or remove ambiguity.
- Public descriptors must remain useful without private payload access.
- Local private context must not leak into public artifacts by convenience.
- Retrospective projections add new edges; they do not rewrite old nodes.
- PWA and site layers are lenses over the graph, not sources of truth.
- Adapters are optional. Core must work when any adapter is absent.
- Model output and daemon-normalized artifacts must remain separate provenance
  layers.
- Dissonance is allowed. Silent failure to verify is not.

## Phase 0: Kernel Freeze

Intent: freeze the minimum conceptual and executable core before adding more
surfaces.

Core descriptors:

- `RawDescriptor`
- `FunctionDescriptor`
- `TransformationDescriptor`
- `IntentDescriptor`
- `NamingProofDescriptor`
- `ArtifactDescriptor`
- `Receipt` vocabulary

Executable core:

- `capture`
- `resolve`
- `verify`
- `verify-graph`
- `lineage`
- `explain`
- `reproject`
- read-only `serve`

Gates:

```bash
deno task check
deno task myc verify-graph
```

Done when:

- descriptor body commitments verify
- graph references resolve
- `graph.ndjson` is fresh
- generated public descriptors do not embed private payload bytes
- pre-commit hook protects the same checks

Non-goals:

- no model execution
- no write API
- no private symlink scanning
- no IPFS/Radicle publishing
- no semantic embedding dependency

Failure signals:

- a descriptor cannot explain its provenance
- a transform points to a missing function
- graph verification becomes optional
- a public file requires private payload to be useful

## Phase 1: Resolver Hardening

Intent: make the local daemon a stable read-only membrane between PWA and local
MYC state.

Deliverables:

- `GET /descriptor?target=...`
- `GET /source?target=...`
- `GET /summary?target=...`
- `GET /search?q=...`
- `GET /version`
- stable JSON error format
- request audit log without payload
- stricter CORS allowlist
- endpoint tests for every route

Gates:

- PWA can render index, descriptor, explain, lineage, graph, and graph health
  without direct filesystem knowledge
- unsupported methods return explicit errors
- audit log records path, method, status, timestamp, no payload

Non-goals:

- no mutation endpoints
- no model calls
- no payload serving
- no background watchers

Failure signals:

- PWA needs to know local paths
- resolver silently reads private payload for public requests
- endpoint output shape changes without schema/version bump

## Phase 2: PWA Lens

Intent: make `myc.md` a usable local-first observer lens, not a global content
server.

Deliverables:

- installable PWA shell
- offline shell cache
- resolver health panel
- graph health panel
- searchable index
- descriptor view
- source view
- explain view
- lineage graph view
- unavailable/private/sealed state display

Gates:

- `https://myc.md` works with local resolver at `127.0.0.1:8787`
- path-based FQDN works, e.g. `https://myc.md/<fqdn>`
- PWA remains useful when local resolver is offline by explaining how to start
  it
- worker tests pass

Non-goals:

- no account system
- no server-side database
- no public payload hosting
- no complex editor

Failure signals:

- UI hides verification state
- UI implies private payload is available when it is not
- Cloudflare Worker becomes a second source of truth

## Phase 3: Semantic Nutrition Labels

Intent: help models and humans understand what kind of semantic food they are
consuming.

Labels:

- `raw`
- `deterministic`
- `witnessed`
- `sealed`
- `private`
- `public`
- `speculative`
- `verified`
- `stale`
- `rejected`
- `compost`

Deliverables:

- `NutritionDescriptor` or embedded `nutrition` block
- freshness policy
- staleness verifier
- public/private/sealed display in PWA
- graph warnings for stale or speculative dependencies

Gates:

- every artifact can say what verification mode it depends on
- models can distinguish raw input, witnessed projection, deterministic
  transform, and sealed/private context

Non-goals:

- no trust score economy yet
- no ATP/stake/slashing
- no forced ranking of models

Failure signals:

- labels become decorative text
- speculative artifacts look verified
- stale artifacts look current

## Phase 4: Recipe Layer

Intent: make reusable transformations explicit before executing anything more
powerful.

Deliverables:

- `RecipeDescriptor`
- dry-run command
- recipe input contract
- recipe output contract
- payload policy
- allowed paths
- forbidden paths
- side-effect declaration

Minimal schema shape:

```yaml
recipe:
  function: "h.<hash>.function.myc.md"
  params: "h.<hash>.params.myc.md"
  context_policy: "public | private | sealed"
  payload_policy: "none | descriptor-only | capability-required"
  side_effects: "none | file-write | network | model-call"
  proof_mode: "deterministic | witnessed | sealed"
```

Gates:

- recipe can be verified before execution
- dry-run can explain required capabilities
- side effects are explicit

Non-goals:

- no autonomous execution
- no write API from PWA
- no background materialization

Failure signals:

- recipe runs without a visible side-effect declaration
- recipe stores payload it was only allowed to observe
- dry-run and execution disagree about required capabilities

## Phase 5: Private And Sealed Capabilities

Intent: let public graph route and reason while private data remains owned by
the owner.

Deliverables:

- `CapabilityDescriptor`
- `SealedReceiptDescriptor`
- capability hash references
- unavailable reason records
- retention policy vocabulary
- request-only flow for payload access

Core policies:

- descriptor-public, payload-private by default
- do not copy by default
- recognize-only must not retain payload
- public graph can reference capability hashes, never secrets

Gates:

- public descriptor remains useful without capability
- resolver can explain why payload is unavailable
- capability records can be verified without exposing tokens

Non-goals:

- no secret storage in git
- no Google Drive sync yet
- no browser direct filesystem assumptions

Failure signals:

- public artifacts leak local paths
- capability token appears in tracked file
- private locator becomes a public URL by accident

## Phase 6: Adapters

Intent: connect MYC to real local substrates without making them core
dependencies.

Adapters:

- Genesis adapter: deterministic physical substrate and verification-heavy tasks
- Liquid adapter: semantic routing, FQDN, deferred intents, causal events
- Codex adapter: local sessions, responses, receipts
- Gemini adapter: local sessions and witnessed projections
- Google Drive adapter: private payload locator and capability source
- GitHub adapter: repo state, commits, issues, PR receipts
- IPFS adapter: optional public content-addressed payloads
- Radicle adapter: optional discussions and patch consensus

Gates:

- adapter failure does not break core `verify-graph`
- adapter output is a descriptor, transform, receipt, or warning
- adapter has clear read/write/payload policy

Non-goals:

- no adapter gets to mutate core silently
- no adapter becomes the canonical source of truth
- no broad filesystem scanning without explicit local policy

Failure signals:

- adapter output cannot be verified
- adapter introduces private leakage
- adapter creates hidden side effects

## Phase 7: JAZZ Integration

Intent: put anti-orchestration on top of MYC descriptors.

JAZZ should use MYC for:

- event descriptors
- response descriptors
- model raw output commitments
- daemon normalization provenance
- receipts
- materialization proposals
- graph verification

Gates:

- raw model output hash is preserved
- daemon-normalized artifact has separate provenance
- no response is attributed only to the model when wrapper changed it
- no materialization without explicit recipe and receipt

Non-goals:

- no conductor agent
- no forced roles
- no "all models must respond"
- no automatic code write from vibe

Failure signals:

- model output and wrapper output collapse into one identity
- silence is treated as failure
- materialization bypasses graph verification

## Phase 8: Publishing And Consensus

Intent: publish selected projections only after local verification is boring.

Publishing targets:

- GitHub
- Cloudflare Worker/PWA
- IPFS
- Radicle
- static public descriptor mirrors

Consensus later:

- discussion threads
- review descriptors
- witness descriptors
- Radicle/GitHub issue bridges
- optional resonance ranking

Gates:

- publish artifact has naming proof
- publish artifact has graph verification receipt
- public projection does not require private payload
- rollback path exists

Non-goals:

- no global consensus before local coherence
- no public payload by default
- no economic stake layer until verification is stable

Failure signals:

- global name points to mutable body without version/hash distinction
- public projection becomes source of truth
- private/sealed layer is required for public graph to make sense

## Model Usage Pattern

MYC should not hard-code model roles, but it should use model strengths
conservatively.

Suggested pattern:

- Human: raw intent, direction, value judgment, final consent
- Gemini-like broad models: wide ideation, alternative framings, long context
  synthesis
- Codex-like verifier: code, tests, graph integrity, protocol drift checks,
  deployment receipts
- Small/local models: summaries, index labels, stale checks, low-risk witnesses

Rule:

```text
models may propose; graph verification decides what can stand
```

## Review Cadence

Use short verification cycles:

1. Capture idea as raw or task descriptor.
2. Produce proposal or implementation.
3. Run local checks.
4. Run graph verification.
5. Inspect public/private/sealed boundary.
6. Commit and push only after receipts.
7. Revisit roadmap gates before adding a new feature family.

Recommended verification prompt:

```text
Audit MYC for protocol drift. Focus on descriptor integrity, graph references,
privacy boundary, stale generated files, and whether any feature bypasses
verify-first / local-first / transformation-first.
```

## Current State

Phase status:

- Phase 0: closed for the current kernel surface.
- Phase 1: implemented and guarded by tests.
- Phase 2: closed by boundary audit.
- Phase 3: active as derived nutrition/staleness layer.
- Adapter policy: implemented as a pre-adapter checkpoint.
- Phase 4: design checkpoint implemented; execution remains disabled.
- Phase 5: design checkpoint implemented; descriptors and access remain
  disabled.
- Phase 6+: design only until the earlier gates stay boring.

Already implemented:

- local `~/myc` repo
- private GitHub repo
- descriptor capture/resolve/verify
- first-class transformation graph
- graph verification
- pre-commit hook
- local read-only resolver
- Cloudflare `myc.md` PWA shell
- resolver endpoints: `/descriptor`, `/source`, `/summary`, `/search`,
  `/version`
- stable resolver error envelope: `ok`, `error`, `message`
- request audit receipt that records method, path, status, timestamp, duration,
  and omits query strings
- endpoint tests for resolver success, errors, CORS, descriptor source, search,
  and audit privacy
- resolver health/index boundary: local filesystem paths are not exposed to PWA
  endpoints unless explicitly requested
- PWA graph report and resolver version display
- PWA summary/source/search views backed by resolver endpoints
- sanitized `/graph` snapshot endpoint with explicit path opt-in
- PWA graph loader backed by `/graph`
- PWA edge list for graph/lineage navigation
- PWA target navigation updates path-based FQDN URL
- PWA degraded offline state with last-seen resolver timestamp
- PWA cached last index/graph projection in localStorage for offline viewing
- PWA manual retry and soft reconnect loop
- Phase 2 PWA lens boundary audit in `public/verification/`
- derived nutrition labels that do not mutate descriptor identity
- `/nutrition?target=...` endpoint
- summary/index/search include derived nutrition
- graph verifier warns on speculative or stale nutrition states
- graph verifier reports nutrition status counts
- staleness recognition for explicit/expired embedded nutrition metadata
- pre-commit protocol audit blocks premature descriptor families, core function
  identity drift, public payload leakage, and public secret-like material
- protocol guardrails audit in `public/verification/`
- root `AGENTS.md` contract for future models
- Phase 3 nutrition boundary audit in `public/verification/`
- GitHub Actions mirrors local `deno task check`
- adapter policy document in `substrates/ADAPTER_POLICY.md`
- Genesis and Liquid substrate notes declare audited adapter policies
- protocol audit rejects substrate adapter notes without read/write/payload and
  side-effect boundaries
- adapter policy audit in `public/verification/`
- recipe draft spec in `protocols/recipes/SPEC.draft.md`
- protocol audit rejects recipe drafts without dry-run, path, payload,
  side-effect, proof, and output contracts
- recipe draft audit in `public/verification/`
- `adapter-dry-run` CLI explains adapter policy without enabling execution
- capability draft spec in `protocols/capabilities/SPEC.draft.md`
- sealed receipt draft spec in `protocols/sealed/SPEC.draft.md`
- protocol audit rejects capability/sealed drafts without authority, retention,
  disclosure, proof, unavailability, and replay boundaries
- capability/sealed draft audit in `public/verification/`
- `availability` CLI and resolver endpoint explain payload access boundaries
  without exposing local private payload paths
- PWA access tab and availability badge display resolver availability without
  exposing local private payload paths
- `/adapter-dry-run?adapter=...` exposes adapter policy inspection as read-only
  resolver output with execution disabled
- PWA adapter dry-run lens inspects adapter policy through the read-only
  resolver endpoint
- resolver response contracts in `protocols/resolver/`, including availability
  and adapter dry-run schema notes
- GitHub Actions uses `actions/checkout@v6` and opts JavaScript actions into
  Node 24 runtime to avoid the scheduled Node 20 runner deprecation
- executable response-shape conformance tests cover availability and adapter
  dry-run resolver contracts
- PWA smoke tests cover availability and adapter dry-run resolver surfaces
- roadmap implementation receipt in `public/verification/`

Immediate next candidates:

1. Optional GitHub branch protection requiring the check workflow.
2. Generated graph/index freshness check as a standalone command.
3. Public verification index in resolver or PWA.

Preferred next step:

```text
Generated Projection Freshness Command
```
