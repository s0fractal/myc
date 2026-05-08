# AGENTS.md - MYC

MYC is a local-first protocol workspace for verified transformations of
commitments. Keep the core small, boring, and auditable.

## Mandatory Checks

Before committing, run:

```bash
deno task check
```

This includes formatting, type-checking, linting, tests, graph verification, and
protocol audit. Do not bypass `.githooks/pre-commit`.

GitHub Actions runs the same command. A change that cannot pass
`deno task check` is not ready for review.

## Hard Rules

- Do not embed private payload bytes in `public/`.
- Do not expose local private payload storage paths in public files.

- Do not add recipe drafts without dry-run, payload, path, side-effect, proof,
  and output contracts.
- Do not add capability/sealed drafts without authority, retention, disclosure,
  proof, unavailability, and replay boundaries.
- Do not add new core function descriptors without updating the locked function
  policy and tests.
- Do not put `nutrition` inside `FunctionDescriptor.body`; nutrition is derived
  unless a later verifier explicitly changes this.
- Do not make the PWA a source of truth. It is only a lens over resolver output.
- Do not make adapter output mutate core silently. Adapter output must be a
  descriptor, transform, receipt, or warning.
- Do not add a substrate adapter note without `adapter_policy`, `read_policy`,
  `write_policy`, `payload_policy`, `side_effects`, `verification`, and
  `failure_mode`.

## Current Phase

Phase 8 is fully implemented (Publishing & Consensus Loop). Phase 9 (Witness and
Trust Topology) is design-only until guardrails and Phase 8 audits stay stable.
Phase 10+ is suspended.

## Useful Commands

```bash
deno task myc verify-graph
deno task myc verify-projections
deno task audit
deno task myc adapter-dry-run genesis
deno task myc availability <fqdn>
deno task myc serve --port 8787
```

## Review Focus

When reviewing changes, check these first:

- descriptor commitment integrity
- graph reference integrity
- function identity drift
- public/private/sealed boundary
- generated graph/index freshness
- premature descriptor families
- payload, token, or local-path leakage
- adapter policy drift
