---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7", "oct:5.1"]
energy: 0.62
mode: "OBSERVE"
tension: "sealed-binding-example"
confidence: "low"
receipt: "file"
---

# Local-Global Binding Example

```yaml
binding:
  public_descriptor: "h.12f026ff.photo.raw.myc.md"
  private_locator_commitment: "h.private-locator"
  capability_commitment: "h.capability"
  resolver_node: "s0fractal-local"

payload:
  state: "remote-capability"
  owner_hint: "people"
  retention_policy: "do-not-copy"

claim:
  kind: "recognized"
  observer: "gemini"
  output: "witness.gemini.people.h.12f026ff.photo.raw.myc.md"

why:
  public:
    - "descriptor exists"
    - "observer emitted witness"
  private:
    - "actual locator"
    - "access session"
  sealed:
    - "locator hash"
    - "capability hash"
```

The public graph can route and reason over the witness without owning the photo.
