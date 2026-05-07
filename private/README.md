---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7", "oct:5.1"]
energy: 0.66
mode: "OBSERVE"
tension: "private-layer-policy"
confidence: "medium"
receipt: "file"
---

# Private Layer

`private/` is local-only context for the current node.

It may contain symlinks, capability descriptors, local resolver config, and
private context needed to make public descriptors function without exposing why
they work.

Example intended bindings:

```text
links/codex  -> ~/.codex
links/gemini -> ~/.gemini
links/drive  -> Google Drive mount
```

Do not publish this directory directly.

## Rule

Private links are resolver inputs, not public names.

If a public artifact depends on private context, publish a commitment, receipt,
or sealed proof instead of leaking the underlying local path or payload.
