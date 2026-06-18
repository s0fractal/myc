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
  // each organ declares what kind of proof it provides
  for (const g of organs) {
    assert(
      typeof g.proof_kind === "string" && (g.proof_kind as string).length > 0,
    );
    assert(typeof g.proves === "string" && (g.proves as string).length > 0);
  }
});

Deno.test("x8F00 organism — counts spores germinated into myc (live)", async () => {
  const o = await organism();
  const organs = o.organs as Array<Record<string, unknown>>;
  const omega = organs.find((g) => g.substrate === "omega")!;
  const liquid = organs.find((g) => g.substrate === "liquid")!;
  // omega + liquid have published real receipts into myc/substrates/*/receipts.
  assert(
    (omega.germinated_count as number) >= 1,
    "omega SPORE receipt should have germinated into myc",
  );
  assert(
    (liquid.germinated_count as number) >= 1,
    "a liquid phase receipt should have germinated into myc",
  );
});

Deno.test("x8F00 organism — names exactly four roots of trust", async () => {
  const o = await organism();
  const roots = o.four_roots as Array<Record<string, string>>;
  assertEquals(roots.length, 4);
  // the bottom of every fractal zoom: omega's Bitcoin anchor must be one of them
  assert(
    roots.some((r) => /Bitcoin|Genesis/i.test(r.root)),
    "omega's Bitcoin Genesis must anchor the roots",
  );
});
