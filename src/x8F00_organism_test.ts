import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { organism } from "./x8F00_organism.ts";

Deno.test("x8F00 organism — the four organs of the body are present", async () => {
  const o = await organism();
  assertEquals(o.type, "organism");
  const organs = o.organs as Array<Record<string, unknown>>;
  const subs = organs.map((g) => g.substrate).sort();
  assertEquals(subs, ["liquid", "myc", "omega", "trinity"]);
  for (const g of organs) {
    assert(
      typeof g.proof_kind === "string" && (g.proof_kind as string).length > 0,
    );
    assert(typeof g.proves === "string" && (g.proves as string).length > 0);
  }
});

Deno.test("x8F00 organism — omega proves PHYSICS, not SPORE (boundary respected)", async () => {
  const o = await organism();
  const organs = o.organs as Array<Record<string, unknown>>;
  const omega = organs.find((g) => g.substrate === "omega")!;
  // omega's proof is its frozen physics (Genesis / law), NOT a SPORE receipt.
  const pk = omega.proof_kind as string;
  assert(/Genesis|law|mitosis/i.test(pk), pk);
  assert(!/SPORE/i.test(pk), "omega must not claim SPORE as its proof");
});

Deno.test("x8F00 organism — SPORE.v0 is the mutation unit (Trinity-owned, backends)", async () => {
  const o = await organism();
  const m = o.mutation as Record<string, unknown>;
  assertEquals(m.protocol, "SPORE.v0");
  assert(/trinity/i.test(m.owner as string), "SPORE is Trinity-owned");
  const backends = m.backends as string[];
  assert(
    backends.includes("wasmtime") && backends.some((b) => /omega-zk/.test(b)),
  );
});

Deno.test("x8F00 organism — counts spores germinated into the membrane (live)", async () => {
  const o = await organism();
  const m = o.mutation as Record<string, unknown>;
  // omega SPORE.v0 apply (1) + liquid phase (2) have published real receipts.
  assert(
    (m.germinated_total as number) >= 3,
    "≥3 receipts should have germinated into myc/substrates",
  );
});

Deno.test("x8F00 organism — names exactly four roots of trust", async () => {
  const o = await organism();
  const roots = o.four_roots as Array<Record<string, string>>;
  assertEquals(roots.length, 4);
  assert(
    roots.some((r) => /Bitcoin|Genesis|549A6307/i.test(r.root)),
    "omega's Bitcoin Genesis must anchor the roots",
  );
});
