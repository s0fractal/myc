# Consensus Layer (Phase 9)

**Status:** Draft / Design Only **Goal:** Establish a subjective,
topologically-derived Web of Trust (WoT) without global state or forced truth.

## Philosophy

In MYC, there is no global blockchain or singular truth. Consensus is strictly
subjective and is built from the bottom up via "Resonance". A node evaluates the
validity of an external graph not by consulting a central authority, but by
tracing cryptographic receipts (`WitnessDescriptor`) and semantic reviews
(`ReviewDescriptor`) from peers it already trusts.

## Descriptors

### `WitnessDescriptor`

When a Node (Actor) successfully imports and cryptographically verifies a
`PublishDescriptor`, it may generate a `WitnessDescriptor`.

- **Purpose**: Prove that the payload was received, its hashes match, and the
  local verifier successfully built the graph projections.
- **Does NOT mean**: That the contents are semantically "good" or "safe" to
  execute. It only means the structural math is correct.

### `ReviewDescriptor`

When an Actor semantically reviews an `IntentDescriptor` or a
`PublishDescriptor` (e.g., reads the recipe source, checks the prompt context,
or audits the payload), they issue a `ReviewDescriptor`.

- **Purpose**: Express a subjective rating (`approve`, `reject`, `neutral`) and
  optionally attach a comment or an analysis payload.
- **Meaning**: This is the foundation of semantic trust.

## Resonance Ranking

When an agent is presented with multiple conflicting `PublishDescriptors` (e.g.,
a fork in a conversation or two different implementations of a recipe), it
calculates the **Resonance**:

1. Start from the local node's own keys (Trust = 1.0).
2. Traverse outward through `ReviewDescriptor` edges. If the local node approved
   Actor B's past intents, Actor B gets a positive trust weight.
3. Multiply the trust weights to rank the incoming `PublishDescriptors`.

_Implementation of Resonance Ranking is deferred to Phase 10._
