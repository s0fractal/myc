# ReviewDescriptor Schema

**Version:** `myc.review.v0.1`

A `ReviewDescriptor` represents a semantic evaluation of an `IntentDescriptor`
or `PublishDescriptor`. It is the primitive for subjective reputation
(Resonance).

```json myc
{
  "type": "ReviewDescriptor",
  "schema_version": "myc.review.v0.1",
  "fqdn": "h.fedcba654321.review.myc.md",
  "commitment": {
    "algorithm": "sha256",
    "value": "8a38795c6ae257fa7493f26f39bad4af1742b98ce61e861f1ffdf9a2aa44d826",
    "covers": "descriptor.body"
  },
  "body": {
    "target_fqdn": "intent.message.s0fractal.h.abcdef.myc.md",
    "target_commitment": "<target_hash>",
    "reviewer": "s0fractal",
    "rating": "approve",
    "comment": "Solid implementation of the PWA lens.",
    "timestamp": "2026-05-08T02:00:00.000Z"
  }
}
```

## Fields

- `target_fqdn`: FQDN of the descriptor being reviewed.
- `target_commitment`: SHA256 hash of the target descriptor's body.
- `reviewer`: The actor providing the review.
- `rating`: Semantic rating. Must be one of: `"approve"`, `"reject"`,
  `"neutral"`.
- `comment`: (Optional) Textual context for the review.
- `timestamp`: ISO-8601 UTC timestamp of the review.
