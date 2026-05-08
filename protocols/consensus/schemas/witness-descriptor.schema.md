# WitnessDescriptor Schema

**Version:** `myc.witness.v0.1`

A `WitnessDescriptor` provides cryptographic proof that an actor has received,
imported, and structurally verified a `PublishDescriptor`.

```json myc
{
  "type": "WitnessDescriptor",
  "schema_version": "myc.witness.v0.1",
  "fqdn": "h.abcdef123456.witness.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "f846d9f5f7790641f1c06cef725ca5d6765afb9ca6d9eaa2c7eb7b5bfac4f873",
    "covers": "descriptor.body"
  },
  "body": {
    "target_fqdn": "h.9876543210ab.publish.myc.md",
    "target_commitment": "<publish_descriptor_hash>",
    "witness_actor": "s0fractal",
    "timestamp": "2026-05-08T01:50:00.000Z",
    "verification_status": "structurally_valid"
  }
}
```

## Fields

- `target_fqdn`: FQDN of the `PublishDescriptor` being witnessed. Must be a
  publish descriptor.
- `target_commitment`: SHA256 hash of the `PublishDescriptor`'s body.
- `witness_actor`: The actor/node that performed the verification.
- `timestamp`: ISO-8601 UTC timestamp of the witnessing event.
- `verification_status`: Must be `"structurally_valid"` indicating the graph
  projections were successfully built.
