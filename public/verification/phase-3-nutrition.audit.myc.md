---
chord:
  primary: "oct:5.1"
  secondary: ["oct:7.2", "oct:6.4", "oct:3.7"]
energy: 0.78
mode: "VERIFY"
tension: "phase-3-derived-nutrition-boundary-audit"
confidence: "high"
receipt: "file"
---

# Phase 3 Nutrition Boundary Audit

## Claim

Nutrition is a derived semantic label layer. It must help humans and models
inspect graph quality without rewriting descriptor identity.

## Verified Boundaries

- `FunctionDescriptor.body` must not contain nutrition metadata.
- Derived nutrition does not mutate descriptor commitments.
- `/nutrition?target=...` returns labels for a resolved descriptor.
- `/summary`, `/index`, and `/search` may include derived nutrition.
- `verify-graph` may warn on `speculative` or `stale` nutrition states.
- `verify-graph` reports `nutrition_counts`.
- Embedded expiration metadata can mark a descriptor stale, but it must still
  pass descriptor commitment verification.

## Explicit Non-Goals

- No trust score economy.
- No ATP/stake/slashing.
- No model ranking.
- No forced rewrite of historical descriptors.
- No nutrition metadata in locked function identity bodies.

## Executable Receipts

```bash
deno task check
deno task audit
```

The active guardrail that protects this boundary is:

```text
FunctionDescriptor identity body must not include nutrition metadata.
```
