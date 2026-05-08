---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4"]
energy: 0.68
mode: "OBSERVE"
tension: "verification-source-response-schema"
confidence: "medium"
receipt: "file"
---

# Verification Receipt Source Response Schema

```yaml
ok: "boolean"
name: "string"
source: "string"
error: "string | absent"
message: "string | absent"
```

Rules:

- `name` must be exactly the basename of the markdown file within
  `public/verification/`, including the `.md` extension.
- The `source` is the raw markdown content of the requested verification receipt
  file.
- The endpoint must not allow path traversal. Only simple alphanumeric basenames
  (with `.` or `_` or `-`) ending in `.md` are allowed.
- Returns `404` and `ok: false` if the requested receipt is not found.
