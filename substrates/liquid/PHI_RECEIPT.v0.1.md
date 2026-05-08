---
chord: ["oct:1.2", "oct:5.3"]
energy: 1.0
tension: "Cryptographic consensus lock for the integer trigonometric base."
---

# PHI RECEIPT v0.1

## Phase Determinism

To achieve subjective waveform collapse without floating point error across
heterogeneous runtimes (Cortex-M4F, WebGPU, WASM), all angular math MUST resolve
to the [0, 65535] integer band.

## Resonance Computation

`calculateResonance(phi_a, phi_b)` computes absolute angular distance in 16-bit
space, mapping the result back to an empirical float for the consensus gate
threshold (`0.25`). Any `phi` derivation that does not use
`Projector.intentToPhase` (SHA-256 normalized) is considered parasitic.

_End of Receipt. Phase Verified._
