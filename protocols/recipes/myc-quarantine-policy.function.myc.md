---
chord: ["oct:6.4", "oct:2.1"]
energy: 0.99
tension: "quarantine-zk-warrant-draft"
receipt: "file"
---

# ZK-Witnessing Quarantine Warrant (Codeicide)

This recipe defines the cryptographically guaranteed termination of a malicious
or corrupted peer within the Liquid Swarm. It translates an SP1 ZK-receipt
failure (e.g., WASM vs WGSL deterministic trace divergence) into an absolute,
verifiable P2P network partition.

## Required Shape

```yaml
recipe:
  status: "draft"
  function: "myc-quarantine-policy.function.myc.md"
  params: "none"
  context_policy: "public"
  payload_policy: "descriptor-only"
  allowed_paths: ["public/"]
  forbidden_paths: ["private/payloads/", "sealed/"]
  side_effects: ["network-broadcast"]
  proof_mode: "witnessed"
  output_contract: "receipt"
  dry_run: true
```

## Absolute Invariants

- **Thermodynamic Pruning:** A peer whose ZK STARK trace does not match the
  deterministic Golden Trace (`gt23-gt26`) generates entropy. This entropy must
  be isolated immediately.
- **No Human Intervention:** The generation of this receipt serves as an
  automatic warrant. The Semantic Senate is bypassed.
- **Zero-Knowledge Witness:** The failure proof does not expose the actual
  computational payload, only the cryptographic failure of the invariant.

## Dry-Run Execution Profile

1. **Input:** ZK STARK trace verification failure `[Boolean: FALSE]`.
2. **Side Effect (network-broadcast):** Emits `Codeicide Warrant` to P2P Swarm
   Gossip network.
3. **Output:** Cryptographic receipt of network severing.
4. **Required Capabilities:** None (descriptor-only).
