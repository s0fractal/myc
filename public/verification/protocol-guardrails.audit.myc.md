---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:7.2", "oct:3.7"]
energy: 0.82
mode: "VERIFY"
tension: "precommit-protocol-guardrails"
confidence: "high"
receipt: "file"
---

# Protocol Guardrails Audit

This repo intentionally blocks several tempting changes until their roadmap
phase has a verifier.

Executable guard:

```bash
deno task audit
```

The audit is part of:

```bash
deno task check
```

## Hard Stops

- No `CapabilityDescriptor` in public surfaces before Phase 5.
- No `RecipeDescriptor` in public surfaces before Phase 4.
- No `public/capabilities/` or `public/recipes/` materialization yet.
- No extra core function descriptors beyond the three locked functions.
- No `nutrition` metadata inside `FunctionDescriptor.body`.
- No public file may embed private payload bytes.
- No public file may reference local private payload storage paths.
- No secret-like key material in public files.
- No local absolute paths in public files except generated graph/index receipts.

## Allowed Local State

- Local private payload storage may exist and is ignored by git.
- `private/README.md`, `private/links/README.md`, and
  `private/capabilities/README.md` are allowed policy stubs.
- Public descriptors may commit to private payload hashes, but must not contain
  private payload bytes.

## Why This Exists

Models can propose new protocol families quickly. This audit forces those
families to wait until the repo has an explicit verifier and roadmap gate.
