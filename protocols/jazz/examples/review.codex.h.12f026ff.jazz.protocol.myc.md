---
chord:
  primary: "oct:5.1"
  secondary: ["oct:3.7", "oct:6.4"]
energy: 0.73
mode: "REVIEW"
tension: "example-response-with-daemon-provenance"
confidence: "medium"
receipt: "file"
---

# review.codex.h.12f026ff.jazz.protocol.myc.md

This is an example social address for a Codex review of a target object.

```yaml
target: "h.12f026ff.jazz.protocol.myc.md"

actor:
  kind: "model"
  id: "codex"
  raw_output_hash: "h.raw-model-output-example"

wrapper:
  kind: "daemon"
  id: "jazzd"
  code_hash: "h.daemon-example"
  config_hash: "h.config-example"
  policy_hash: "h.policy-example"
  transform: "normalize"

artifact:
  relation: "review"
  stance: "MIXED"
  fqdn: "review.codex.h.12f026ff.jazz.protocol.myc.md"
  output_hash: "h.final-example"
```

## Review Body

The target is promising, but this example intentionally separates the raw model
output from the daemon-normalized artifact.
