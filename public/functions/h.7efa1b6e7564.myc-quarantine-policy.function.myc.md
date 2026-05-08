---
chord:
  primary: "oct:6.2"
  secondary: ["oct:5.3"]
energy: 0.88
mode: "PATCH"
tension: "functiondescriptor-generated"
confidence: "high"
receipt: "file"
---

# h.7efa1b6e7564.myc-quarantine-policy.function.myc.md

Deterministic MYC function descriptor for ZK-Codeicide Warrants.

```json myc
{
  "type": "FunctionDescriptor",
  "schema_version": "myc.function.v0.1",
  "fqdn": "h.7efa1b6e7564.myc-quarantine-policy.function.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "7efa1b6e75640d56140e7e7e83f094de6222f75231c9dcd856fbf7cd5c34626e",
    "covers": "descriptor.body"
  },
  "body": {
    "name": "myc.policy.quarantine.v1",
    "version": "0.1.0",
    "kind": "verifier",
    "determinism": "deterministic",
    "rule": "Verifies SP1 ZK-receipts proving absolute Golden Trace divergence between WASM and WGSL. Yields Codeicide Warrant.",
    "inputs": [
      "target_node_pubkey",
      "sp1_receipt_divergence",
      "golden_trace_anchor"
    ],
    "outputs": [
      "quarantine_warrant_receipt"
    ]
  }
}
```
