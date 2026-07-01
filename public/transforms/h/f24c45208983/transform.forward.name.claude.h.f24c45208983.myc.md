---
chord:
  primary: "oct:6.4"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.68
mode: "PATCH"
tension: "transformationdescriptor-generated"
confidence: "medium"
receipt: "file"
---

# transform.forward.name.claude.h.f24c45208983.myc.md

First-class transformation edge. This file describes a verified knowledge transformation.

```json myc
{
  "type": "TransformationDescriptor",
  "schema_version": "myc.transform.v0.1",
  "fqdn": "transform.forward.name.claude.h.f24c45208983.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "529e5467d8ab62ec98cfce00151673de7c65aefe064f0038e387b988e0865092",
    "covers": "descriptor.body"
  },
  "body": {
    "step": "name",
    "direction": "forward",
    "proof_mode": "deterministic",
    "actor": "claude",
    "input": [
      {
        "role": "intent",
        "fqdn": "intent.task.claude.h.f24c45208983.myc.md",
        "commitment": "8a7d430c5f53c8f6a5ada23f4195c4cd2adba70438940146d4eb2ced9450047c"
      }
    ],
    "function": {
      "fqdn": "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
      "commitment": "849874aa8a185af43168cc957d7db7abbad478aefdaae848df120b97f888b91e",
      "determinism": "deterministic"
    },
    "context_commitment": "fb06813273f054eff554e65874d79a9d921e45852923c6bb44af8779446fab4b",
    "params_commitment": "7ca5fa841fe4d5706f95ad71becb2f6f88cae11cbbc1605fbaa89d8ed74b337f",
    "output": [
      {
        "role": "naming-proof",
        "fqdn": "naming-proof.claude.h.f24c45208983.myc.md",
        "commitment": "05ec81a52b7bb93545867f26038b52d47e9c314beeb45a29bc42178487e7274c"
      },
      {
        "role": "artifact-address",
        "fqdn": "task.claude.h.f24c45208983.myc.md",
        "commitment": "192e2cad69a1800f3f6dd134170918002628ab5d7604ba3df21b998e66ba4aad"
      }
    ],
    "oct": "oct:6.4",
    "note": "Render a human-readable FQDN and record its naming proof.",
    "receipts": []
  }
}
```
