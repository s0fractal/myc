// Subjectivity guard — fable-5's Dictatorship Diff, inversion #1 (x2B00_956450).
//
// The deepest inversion of this architecture is one schema field away: subjective
// τ → a CANONICAL trust-score written to a node = social credit. This test makes
// that inversion LOUD: the PUBLISHED network's node identity is content +
// provenance, never an aggregated authoritative trust. Trust here is subjective and
// RECOMPUTED by the reader (verifyCommitment / the external court), never a stored
// canonical property. If a published node ever carries one, CI reds.
//
// Scoped to the published graph (myc). Legitimate SUBJECTIVE/local trust (e.g.
// liquid's per-peer recomputed net_giving, a view, never published as a node
// property) is not touched — the danger is a canonical score in the SHARED graph.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import SNAPSHOT from "../sites/myc.md/snapshot.gen.json" with { type: "json" };

// Field names that denote an AGGREGATED, authoritative, node-level score — the
// social-credit shape. (Not "trust" alone: a subjective trust VIEW is a function,
// not a stored node field.)
const CANONICAL_TRUST_FIELDS = new Set([
  "trust_score",
  "reputation",
  "credibility",
  "credibility_score",
  "social_credit",
  "canonical_trust",
  "rank_score",
  "trust_rank",
]);

export function canonicalTrustFields(obj: unknown, path = ""): string[] {
  const hits: string[] = [];
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (CANONICAL_TRUST_FIELDS.has(k.toLowerCase())) {
        hits.push(`${path}.${k}`);
      }
      hits.push(...canonicalTrustFields(v, `${path}.${k}`));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) =>
      hits.push(...canonicalTrustFields(v, `${path}[${i}]`))
    );
  }
  return hits;
}

Deno.test("subjectivity guard: no published node carries a canonical trust-score", () => {
  const offenders: string[] = [];
  for (const r of SNAPSHOT.records) {
    const body = (r as { descriptor?: { body?: unknown } })?.descriptor?.body ??
      {};
    offenders.push(
      ...canonicalTrustFields(body, (r as { fqdn?: string })?.fqdn ?? "?"),
    );
  }
  assert(
    offenders.length === 0,
    `a canonical trust-score became a node property (social credit — the #1 inversion): ${
      offenders.join(", ")
    }`,
  );
});

Deno.test("subjectivity guard actually catches the inversion (falsifier)", () => {
  // The guard must be able to FAIL: a node with a canonical trust_score is caught.
  const injected = canonicalTrustFields(
    { note: "an honest thought", trust_score: 0.92, reputation: 5 },
    "synthetic",
  );
  assert(
    injected.length === 2,
    "the guard must detect canonical trust_score + reputation fields",
  );
  // and a subjective trust VIEW (a computed function result, not a node field) is
  // NOT a canonical field — the guard does not false-positive legitimate trust.
  assert(
    canonicalTrustFields({ note: "x", my_trust_of_peer_recomputed: 0.3 })
      .length === 0,
    "a subjective/recomputed trust value is not a canonical node property",
  );
});
