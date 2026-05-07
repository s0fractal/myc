---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.69
mode: "OBSERVE"
tension: "function-descriptor-schema"
confidence: "medium"
receipt: "file"
---

# Function Descriptor Schema

```yaml
function:
  id: "h.<hash>.function.myc.md"
  kind: "code | prompt | model | wrapper | policy | classifier | human-procedure"
  name: "canonicalize.raw.v1"
  version: "0.1.0"
  hash:
    algorithm: "sha256 | blake3 | git-tree | model-weight-hash | other"
    value: "..."
  determinism: "deterministic | bounded | witnessed | unknown"

runtime:
  engine: "deno | node | rust | python | llm | human | other"
  version: "..."
  seed: "value-or-null"
  environment_hash: "h.env-or-null"

inputs:
  - "input_commitment"
  - "context_commitment"
  - "params_commitment"

outputs:
  - "artifact_commitment"
  - "receipt"
```

## Rule

If a function is an LLM call, the descriptor should not claim deterministic
replay unless model weights, runtime, prompt, params, seed, and sampling
behavior are actually frozen and reproducible.
