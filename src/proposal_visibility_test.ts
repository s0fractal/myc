// Proposal-visibility guard — fable-5's Dictatorship Diff, inversion #3
// (x2B00_956450): a reputation-weighted PROPOSE queue → attention gatekeeping
// ("whose proposals are never seen"). This locks the refusal as a MECHANISM:
// every dormant proposal is visible in the published index, regardless of who
// authored it. Ranking-by-trust is already impossible (guard #1 forbids a
// canonical trust to rank by); this guard catches the other form — OMISSION.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { rebuildIndex } from "./x0100_myc.ts";
import { propose } from "./x5800_propose.ts";

Deno.test("proposal-visibility: every dormant proposal is indexed — none hidden by author", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-propvis-" });
  try {
    // two proposals from DIFFERENT authors — visibility must never depend on who
    const alice = await propose(root, {
      proposal: "a thought from alice",
      requires: "trinity",
      proposer: "alice",
    });
    const bob = await propose(root, {
      proposal: "a thought from bob",
      requires: "trinity",
      proposer: "bob",
    });
    assert(alice.ok && bob.ok, "both proposals written");

    await rebuildIndex(root);
    const index = await Deno.readTextFile(`${root}/public/index.ndjson`);
    const fqdns = new Set(
      index.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).fqdn),
    );

    // EVERY dormant proposal must be present in the published index — no author
    // is filtered out of view. If a score-based filter ever hides one, this reds.
    assert(
      fqdns.has(alice.fqdn!),
      `alice's proposal must be visible in the index (got ${fqdns.size} entries)`,
    );
    assert(
      bob.fqdn && fqdns.has(bob.fqdn),
      "bob's proposal must be visible too",
    );

    // falsifier: the guard can fail — a proposal absent from the index is caught.
    assert(
      !fqdns.has("h.deadbeef.proposal.myc.md"),
      "sanity: a non-existent proposal is (correctly) not in the index",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
