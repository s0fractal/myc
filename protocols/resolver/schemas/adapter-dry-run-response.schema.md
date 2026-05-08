---
chord:
  primary: "oct:3.7"
  secondary: ["oct:5.1"]
energy: 0.69
mode: "OBSERVE"
tension: "adapter-dry-run-response-schema"
confidence: "medium"
receipt: "file"
---

# Adapter Dry-Run Response Schema

```yaml
ok: "boolean"
adapter: "string"
path: "string"
status: "draft | active | quarantined | absent"
read_policy: "none | explicit-roots | explicit-files | capability-required | absent"
write_policy: "none | proposal-only | receipt-only | explicit-commit | absent"
payload_policy: "none | descriptor-only | sealed-only | capability-required | absent"
side_effects: [
  "none | file-read | file-write | network-read | network-write | model-call | test-run | git-read | git-write",
]
verification: ["string"]
failure_mode: "warn-only | quarantine | hard-stop | absent"
output_contract: ["descriptor", "transform", "receipt", "proposal", "warning"]
execution_enabled: false
errors: ["string"]
```

Rules:

- `execution_enabled` must stay `false` until a later phase explicitly opens
  adapter execution.
- The response may inspect policy text; it must not execute adapter commands.
- A missing or malformed adapter returns `ok: false`.
- `path` is local resolver context and should not be written into public graph
  artifacts.
