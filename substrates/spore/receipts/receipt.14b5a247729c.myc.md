---
schema_version: "myc.spore.receipt.v0.1"
chord: ["oct:2.receipt", "oct:6.ledger", "oct:1.physics"]
energy: 1.0
tension: "Spore Apply Publication Receipt"
type: "SealedReceiptDescriptor"
intent_hash: "none"
status: "APPLIED"
signature: "unsigned"
fuel_model: "spore.fuel.v1"
record_verified: true
spore_id: "14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688"
mutator_hash: "5bd70a84dce70b28c018ddbe253d1ef96557007816a7ecaa9c4609a2524ca10d"
output_hash: "cf42e43aee73abbbfbcdec23fa8b2c66162ce579a160e8cbadfbcf4693bd138a"
total_fuel: 649
trapped: false
---

# Spore Receipt: 14b5a247729c

This descriptor publishes a SPORE.v0 apply receipt into MYC. MYC verified
descriptor consistency: the record hash, embedded multihashes, argument count,
and apply-boundary fuel agree. MYC did not execute the WASM mutator.

## Execution Details

- **Spore ID**:
  `14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688`
- **Mutator ($F_{hash}$)**:
  `5bd70a84dce70b28c018ddbe253d1ef96557007816a7ecaa9c4609a2524ca10d`
- **Output Hash ($O_{hash}$)**:
  `cf42e43aee73abbbfbcdec23fa8b2c66162ce579a160e8cbadfbcf4693bd138a`
- **Fuel Consumed**: 649 ATP (Body: 644 ATP)
- **Apply Boundary**: 5 ATP
- **Arguments**: 1
- **Flags**: 0x0001
- **Trapped**: false

### Argument Hashes ($A_{hash}$)

- `ed1c6b56db653a6d4e71d363f70b3dc4efa4b36b3f844663bd171e07350fdf99`

### Raw Record Hex

```hex
53504f5200010001011e205bd70a84dce70b28c018ddbe253d1ef96557007816a7ecaa9c4609a2524ca10d1e20ed1c6b56db653a6d4e71d363f70b3dc4efa4b36b3f844663bd171e07350fdf991e20cf42e43aee73abbbfbcdec23fa8b2c66162ce579a160e8cbadfbcf4693bd138a
```

> [!NOTE]
> Publication invariant verified:
> `spore_id = BLAKE3.derive_key("spore.apply.v0", record_hex)`. Execution
> validity still belongs to the SPORE executor or a stronger verifier.
