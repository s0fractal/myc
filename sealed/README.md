---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.64
mode: "OBSERVE"
tension: "sealed-layer-policy"
confidence: "medium"
receipt: "file"
---

# Sealed Layer

`sealed/` contains commitments and proofs that preserve verifiability without
revealing full cause or payload.

Possible contents:

- hash commitments
- signatures
- encrypted receipts
- ZK proof descriptors
- witness-only records
- unavailable reason records

## Purpose

The sealed layer lets an artifact prove enough to function globally without
publishing the private `why`.
