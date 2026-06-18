import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIFECYCLE, lifecycle } from "./x3F00_lifecycle.ts";

Deno.test("x3F00 lifecycle — defines one canonical vocabulary", () => {
  const states: string[] = LIFECYCLE.map((s) => s.state);
  for (
    const required of [
      "applied",
      "published",
      "witnessed",
      "resonant",
      "dormant",
      "invalid",
    ]
  ) {
    assert(states.includes(required), `vocabulary must include ${required}`);
  }
});

Deno.test("x3F00 lifecycle — classifies BOTH apply-receipts and consensus nodes", async () => {
  const o = await lifecycle();
  assertEquals(o.type, "lifecycle");
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const kinds = new Set(mutations.map((m) => m.kind));
  // the repo ships SPORE + phase apply-receipts AND a consensus publish node.
  assert(
    kinds.has("spore-apply") || kinds.has("phase"),
    "an apply-receipt should be present",
  );
  assert(kinds.has("consensus"), "a consensus node should be present");
});

Deno.test("x3F00 lifecycle — apply-receipts read as 'applied'", async () => {
  const o = await lifecycle();
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const applied = mutations.filter((m) =>
    m.kind === "spore-apply" || m.kind === "phase"
  );
  assert(applied.length >= 1);
  for (const m of applied) assertEquals(m.state, "applied");
});

Deno.test("x3F00 lifecycle — proposals read as the 'proposed' head state", async () => {
  const o = await lifecycle();
  const mutations = o.mutations as Array<Record<string, unknown>>;
  for (const m of mutations) {
    if (m.kind === "proposal") assertEquals(m.state, "proposed");
  }
});

Deno.test("x3F00 lifecycle — consensus node carries a real trust state", async () => {
  const o = await lifecycle();
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const consensus = mutations.filter((m) => m.kind === "consensus");
  for (const m of consensus) {
    assert(
      ["published", "witnessed", "reviewed", "resonant", "dormant", "invalid"]
        .includes(String(m.state)),
      `consensus state ${m.state} must be in the vocabulary`,
    );
  }
});
