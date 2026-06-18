// src/x0200_resolve_test.ts — conformance lock for the canonical commitment.
//
// The commitment is the keystone of the trust fabric: the ONE value the CLI
// resolver, the PWA worker, and the provenance spec must all agree on, or a file
// proven in one place cannot be trusted in another. This file pins that value and
// encodes WHY the scheme is `sha256(fqdn + "\n" + body.trimEnd())` and not
// content-only or frontmatter-only — by testing the two security properties the
// spec (x0000_spec_provenance §2) states as its goals.
//
// The PWA worker reimplements this in browser JS (different runtime, no shared
// import); these vectors are the contract it must reproduce.

import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalCommitment } from "./x0200_resolve.ts";

// ── the conformance vector ───────────────────────────────────────────────────
// Fixed inputs → fixed commitment. Any implementation that claims conformance
// MUST reproduce this exact hash. (Documented in x0000_spec_provenance.myc.md.)
const VECTOR = {
  fqdn: "x0000_conformance.myc.md",
  body:
    "# Conformance Vector\n\nThis body is the canonical commitment input.\nName + content are bound; mutable frontmatter is not.\n",
  commitment:
    "sha256:0cd0ac37654f234bde63ddb72ca3ff3920ed0fa5d2602d07221528b7b2a0d875",
};

Deno.test("commitment conformance: the canonical vector is reproduced exactly", async () => {
  const got = await canonicalCommitment(VECTOR.fqdn, VECTOR.body);
  assertEquals(got, VECTOR.commitment);
});

Deno.test("commitment is stable across trailing-whitespace differences", async () => {
  // trimEnd() normalization: a final newline / trailing spaces are not semantic
  // content, so editors that add or strip them must not break the proof.
  const a = await canonicalCommitment(VECTOR.fqdn, VECTOR.body);
  const b = await canonicalCommitment(VECTOR.fqdn, VECTOR.body.trimEnd());
  const c = await canonicalCommitment(VECTOR.fqdn, VECTOR.body + "\n\n  ");
  assertEquals(a, b);
  assertEquals(a, c);
});

Deno.test("anti-tampering: changing the body changes the commitment", async () => {
  // The spec's goal #1 (payload tampering). A frontmatter-only commitment would
  // MISS this — which is exactly why the worker's old scheme was insufficient.
  const tampered = VECTOR.body.replace("canonical", "TAMPERED");
  const got = await canonicalCommitment(VECTOR.fqdn, tampered);
  assertNotEquals(got, VECTOR.commitment);
});

Deno.test("anti-spoofing: the same body under a different coordinate does NOT verify", async () => {
  // The spec's goal #2 (identity spoofing). A content-only commitment would
  // produce the SAME hash here — letting a signed body be replayed under a
  // different coordinate. Binding the fqdn is what closes that hole.
  const spoofed = await canonicalCommitment("x9999_spoof.myc.md", VECTOR.body);
  assertNotEquals(spoofed, VECTOR.commitment);
});

Deno.test("the commitment is a hex sha256 with the algorithm prefix", async () => {
  const got = await canonicalCommitment(VECTOR.fqdn, VECTOR.body);
  assert(/^sha256:[0-9a-f]{64}$/.test(got));
});
