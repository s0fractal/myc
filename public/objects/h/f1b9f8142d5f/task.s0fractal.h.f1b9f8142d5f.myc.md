---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "artifactdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# task.s0fractal.h.f1b9f8142d5f.myc.md

Produced projection descriptor.

```json myc
{
  "type": "ArtifactDescriptor",
  "schema_version": "myc.artifact.v0.1",
  "fqdn": "task.s0fractal.h.f1b9f8142d5f.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "67342db2b6b28385f62a4a6e033257cf4ee3f3813a05dbca77666e921b2066d1",
    "covers": "descriptor.body"
  },
  "body": {
    "immutable_fqdn": "h.fc2538969707.task.s0fractal.h.f1b9f8142d5f.myc.md",
    "relation": "intent-projection",
    "target": "h.f1b9f8142d5f.plan.s0fractal.raw.myc.md",
    "raw_hash": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
    "artifact_hash": "fc2538969707b7aa313cbb575564b9b743d783ef77d01afceca4890426d90519",
    "formula": {
      "expression": "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
      "input": {
        "function_hash": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
        "input_commitment": "f1b9f8142d5f6a522c2e66766aa2e46203a63734fc583a0ecbad3d0d3826c06f",
        "context_commitment": "5fbdc502678d969f9e3cf0e3d93de2ee0f116cd812e71176a50c42cc09ad0ba5",
        "params_commitment": "3a7d9c4ef40291ad2c9903adc0dcfb129281c009122643b959bf2ce8a5d267f5"
      }
    },
    "proof_mode": "deterministic",
    "payload_state": "private-local",
    "intent": "intent.task.s0fractal.h.f1b9f8142d5f.myc.md",
    "naming_proof": "naming-proof.s0fractal.h.f1b9f8142d5f.myc.md",
    "oct": "oct:5.1",
    "classification": {
      "kind": "task",
      "actionability": "patch",
      "oct": "oct:5.1",
      "confidence": "medium",
      "signals": [
        "task:implement",
        "task:write",
        "task:create",
        "task:add",
        "task:update",
        "task:run",
        "task:verify",
        "idea:protocol",
        "question:?",
        "question:what"
      ]
    }
  }
}
```
