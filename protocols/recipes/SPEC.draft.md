---
chord:
  primary: "oct:7.2"
  secondary: ["oct:5.1", "oct:6.4"]
energy: 0.76
mode: "OBSERVE"
tension: "recipe-design-checkpoint"
confidence: "medium"
receipt: "file"
---

# Recipe Draft Spec

Recipes describe reusable transformations before execution.

Phase 4 is a design checkpoint. This file does not enable autonomous execution
and does not enable public recipe descriptors. It only fixes the minimum shape
future recipes must satisfy.

## Required Shape

```yaml
recipe:
  status: "draft"
  function: "h.<hash>.function.myc.md"
  params: "h.<hash>.params.myc.md | none"
  context_policy: "public | private | sealed"
  payload_policy: "none | descriptor-only | capability-required"
  allowed_paths: ["public/"]
  forbidden_paths: ["private/payloads/"]
  side_effects: ["none"]
  proof_mode: "deterministic | witnessed | sealed"
  output_contract: "descriptor | transform | receipt | proposal | warning"
  dry_run: true
```

## Rules

- A recipe must be explainable before execution.
- A dry-run must list required capabilities and side effects.
- Dry-run and execution must agree about payload policy.
- `side_effects: ["none"]` means no file write, network call, model call, or git
  write.
- Public recipe descriptors remain disabled until the roadmap explicitly opens
  Phase 4.
- Recipe drafts are not authority. They are review targets.

## Failure Signals

- recipe mentions a function but not payload policy;
- recipe can write without declaring `file-write`;
- recipe reads private material with `payload_policy: "none"`;
- recipe stores payload bytes in public descriptors;
- dry-run output cannot be reviewed without executing the recipe.
