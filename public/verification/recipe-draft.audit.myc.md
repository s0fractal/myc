---
chord:
  primary: "oct:7.2"
  secondary: ["oct:5.1", "oct:6.4"]
energy: 0.73
mode: "REVIEW"
tension: "recipe-draft-audit"
confidence: "high"
receipt: "file"
---

# Recipe Draft Audit

Recipe execution is not enabled.

The protocol audit now checks recipe drafts under `protocols/recipes/` for a
minimum contract whenever a file contains `recipe:`.

Required keys:

- `function`
- `params`
- `context_policy`
- `payload_policy`
- `allowed_paths`
- `forbidden_paths`
- `side_effects`
- `proof_mode`
- `output_contract`
- `dry_run`

This lets the roadmap move toward Phase 4 without allowing hidden execution.
