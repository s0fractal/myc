---
chord:
  primary: "oct:5.4"
  secondary: ["oct:6.4", "oct:5.1"]
energy: 0.77
mode: "OBSERVE"
tension: "capability-design-checkpoint"
confidence: "medium"
receipt: "file"
---

# Capability Draft Spec

Capabilities describe requestable authority without publishing secrets.

Phase 5 is a design checkpoint. This file does not enable
`CapabilityDescriptor`, does not create `public/capabilities/`, and does not
authorize payload reads. It fixes the minimum shape future capability records
must satisfy.

## Required Shape

```yaml
capability_contract:
  status: "draft"
  subject: "h.<payload-or-descriptor-commitment>"
  requester: "local | named-agent | public"
  operation: "recognize | verify | read | transform | retain"
  payload_policy: "none | descriptor-only | sealed-only | capability-required"
  retention_policy: "none | session | explicit-expiry | owner-controlled"
  disclosure_policy: "hash-only | sealed-receipt | redacted-summary"
  expiry: "none | iso8601"
  revocation: "owner-local | signed-record | unavailable"
  proof_mode: "witnessed | sealed"
  secret_material: "never-public"
```

## Rules

- A public graph may reference a capability hash, never a token.
- `recognize` and `verify` must not retain payload bytes.
- `read` and `transform` require explicit capability policy.
- A capability can explain unavailability without granting access.
- Capability records are local or sealed until a later phase explicitly enables
  public descriptors.

## Failure Signals

- token-like material appears in a tracked file;
- public record contains local private locator;
- `retain` is implied but not declared;
- capability grants access without expiry or revocation story;
- public graph becomes useless when capability is unavailable.
