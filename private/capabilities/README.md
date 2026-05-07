---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4"]
energy: 0.58
mode: "OBSERVE"
tension: "capability-layer-policy"
confidence: "medium"
receipt: "file"
---

# Capabilities

This directory is for local-only capability descriptors and access policies.

Capability records may describe who can request a payload, what operation is
allowed, whether retention is forbidden, and what receipt must be produced.

Secrets should not be committed or published. Public artifacts should reference
capability hashes, not tokens.
