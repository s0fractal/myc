---
type: myc.roadmap-projection
status: draft
coordinate: x8D00
source_layer: myc
sources:
  - ROADMAP.md
  - MYC.md
  - AGENTS.md
projects_to:
  - trinity.federated_roadmap
falsifiers:
  - "If this file becomes the source of truth for myc behavior, it is over-promoted. ROADMAP.md is canonical."
  - "If trinity reads ROADMAP.md directly and skips this projection, the layer boundary leaked."
  - "If far-horizon signals here become immediate backlog, the projection failed."
---

# Myc Roadmap Projection

Draft bridge, not a replacement for `ROADMAP.md`. Mirrors the omega projection
pattern (see `omega/src/x8D00_roadmap_projection.myc.md`).

`ROADMAP.md` is myc's authoritative phase backlog (Phases 0-9 + Model Usage +
Review Cadence). This projection names the **slow signals** — what myc is
becoming as a substrate, not the immediate next-task list.

## Flow

```text
myc/ROADMAP.md (phase backlog, current state)
  -> myc/src/x8D00_roadmap_projection.myc.md (this — slow-signal bridge)
  -> trinity federated roadmap (consumes projection, not raw ROADMAP)
```

## Far-Horizon Signals

### Phase 9: Witness And Trust Topology

Signal: myc grows a multi-witness consensus layer — published artifacts become
quorum-attested rather than single-owner published. The descriptor stack:
PublishDescriptor, WitnessDescriptor, and a cross-witness verification mesh.

Roadmap pressure: keep publishing pluralistic; no single witness should
unilaterally authoritate consensus. Witness identity must be capability-gated,
not implicit.

Not a backlog item: do not collapse witness mesh into single-publisher shortcut
even when one-witness validation would suffice.

### Beyond Phase 9: Cross-Substrate Publishing

Signal: myc becomes the publication frontier for trinity/omega/liquid receipts.
Other substrates emit verified transformations; myc renders them into public,
content-addressed projections discoverable via FQDN semantic DNS.

Roadmap pressure: keep `public/` strictly descriptor-only ("public-
descriptor-private-payload"); never let substrates push payload bytes into myc's
public surface. Adapter discipline (substrates/<name>/) is the boundary.

Not a backlog item: do not pre-build adapters for substrates that haven't asked
for publication; let pull-requests come from substrates.

### Indefinite Horizon: Local-First Sovereignty

Signal: myc remains local-first regardless of network/cloud infrastructure
shifts. The core formula
(`artifact = function_hash(input_commitment, context_commitment,
params_commitment)`)
survives substrate migrations, browser/runtime turnover, and protocol-version
churn.

Roadmap pressure: every new feature must preserve the
verify-first/local-first/transformation-first triad declared in ROADMAP.md
preamble. Reject features that require cloud reachability or hidden private
state for verification.

Not a backlog item: this is mythic-horizon orientation. Don't crystallize
sovereignty into a contract; live it instead.

## Projection Contract

Myc owns this projection because myc owns its phase backlog and sovereignty
principles. Trinity should consume this file, or a generated successor, as myc's
declared far-horizon signal. Trinity should not mine `ROADMAP.md` or `MYC.md`
directly unless myc has no projection.

If the architect or a future myc-aware voice wants to extend the projection,
edit this file. If far-horizon signals materialize as immediate next-step
backlog, move them OUT of here and INTO ROADMAP.md phases.
