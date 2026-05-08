---
chord:
  primary: "oct:5.4"
  secondary: ["oct:5.1"]
energy: 0.68
mode: "OBSERVE"
tension: "availability-response-schema"
confidence: "medium"
receipt: "file"
---

# Availability Response Schema

```yaml
ok: "boolean"
target: "string"
fqdn: "string | absent"
descriptor_type: "string | absent"
payload_state: "none | private-local | remote-capability | known-but-unavailable | witness-only | string"
payload_available_to_requester: "boolean"
private_payload_present: "boolean"
unavailable_reason: "no-payload-required | available-to-local-owner | private-payload-missing | requires-owner-capability | known-but-unavailable | witness-only | unsupported-payload-state:<state> | descriptor-not-found"
access_mode: "descriptor-only | local-private | commitment-only | capability-gated | sealed-or-witnessed | unknown | none"
safe_next_steps: ["string"]
errors: ["string"]
```

Rules:

- `private_payload_present` is a boolean fact, not a path disclosure.
- `payload_available_to_requester` does not imply public payload access.
- `local-private` means the current resolver node can verify locally.
- Missing descriptors return `ok: false` and
  `unavailable_reason:
  descriptor-not-found`.
