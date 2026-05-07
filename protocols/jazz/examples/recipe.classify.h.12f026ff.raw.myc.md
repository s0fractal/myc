---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7", "oct:5.1"]
energy: 0.67
mode: "OBSERVE"
tension: "example-classification-recipe"
confidence: "medium"
receipt: "file"
---

# recipe.classify.h.12f026ff.raw.myc.md

```yaml
recipe:
  input_commitment: "h.12f026ff.raw.myc.md"
  context_commitment: "h.session-context-example"
  params_commitment: "h.classifier-params-example"

  function:
    id: "h.intent-classifier-v1.function.myc.md"
    kind: "classifier"
    determinism: "witnessed"

  expected_outputs:
    - "intent.kind"
    - "intent.actionability"
    - "address.oct"
    - "candidate_fqdn"

  privacy:
    may_read_payload: false
    may_read_descriptor: true
    may_store_payload: false
```

This recipe classifies a raw descriptor without assuming access to the raw
payload.
