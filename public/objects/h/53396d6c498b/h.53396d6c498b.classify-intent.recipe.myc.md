---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "OBSERVE"
tension: "genesis-recipe-intent-classification"
confidence: "high"
receipt: "file"
---

# h.53396d6c498b.classify-intent.recipe.myc.md

Genesis recipe for deterministic intent classification.

```json myc
{
  "type": "RecipeDescriptor",
  "schema_version": "myc.recipe.v0.1",
  "fqdn": "h.53396d6c498b.classify-intent.recipe.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "53396d6c498b7fb231c9e0c16ba18cb1f3694a2b3f44369fcfd74395163100da",
    "covers": "descriptor.body"
  },
  "body": {
    "recipe": {
      "function": "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
      "context_policy": "public",
      "payload_policy": "capability-required",
      "side_effects": [
        "none"
      ],
      "proof_mode": "deterministic",
      "output_contract": "transform",
      "dry_run": true
    }
  }
}
```
