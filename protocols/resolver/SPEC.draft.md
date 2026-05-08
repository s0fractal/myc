---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:7.2"]
energy: 0.72
mode: "OBSERVE"
tension: "resolver-response-contracts"
confidence: "medium"
receipt: "file"
---

# Resolver Response Draft Spec

The local resolver is a read-only lens over MYC descriptors, graph edges, and
operator-owned private state. It must preserve privacy while giving models
stable JSON contracts.

## Stable Envelope

Successful responses use:

```json
{
  "ok": true
}
```

Error responses use:

```json
{
  "ok": false,
  "error": "stable-machine-code",
  "message": "Human readable sentence."
}
```

Audit logs record method, path, status, timestamp, and duration. They must not
record query strings.

## Privacy Defaults

- No endpoint returns private payload bytes.
- No endpoint returns local private payload paths by default.
- Path-bearing graph/index forms require explicit `?paths=1`.
- Capability and adapter outputs are inspection surfaces, not execution
  surfaces.

## Current Read-Only Surfaces

- `/health`
- `/index`
- `/resolve`
- `/descriptor`
- `/source`
- `/summary`
- `/nutrition`
- `/availability`
- `/verify`
- `/verify-graph`
- `/graph`
- `/lineage`
- `/explain`
- `/search`
- `/adapter-dry-run`
- `/version`

Future resolver responses should add fields conservatively and keep existing
field names stable.
