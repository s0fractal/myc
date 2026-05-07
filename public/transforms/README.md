---
chord:
  primary: "oct:7.2"
  secondary: ["oct:6.4", "oct:5.1"]
energy: 0.66
mode: "OBSERVE"
tension: "public-transforms-layer"
confidence: "medium"
receipt: "file"
---

# Public Transformations

`public/transforms/` contains first-class transformation descriptors.

These are graph edges:

```text
input --[function + context + params]--> output
```

They are intentionally separate from objects. A raw descriptor, intent
descriptor, naming proof, and artifact can all exist as nodes, but the
transformation files explain how the graph moved from one node to another.

`public/graph.ndjson` is generated from these descriptors.
