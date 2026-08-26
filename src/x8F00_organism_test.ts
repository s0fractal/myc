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
    roots.some((r) => /Genesis 0x716EA2F8/i.test(r.root)),
    "omega's canonical Genesis identity must anchor the roots",
  );
});

Deno.test("x8F00 organism — omega's Genesis is not claimed to be Bitcoin-inscribed", async () => {
  // A NEGATIVE assertion, because the false claim is the thing that keeps coming
  // back. Omega's Bitcoin anchoring is live, but the one mainnet anchor covers
  // `OMEGA1:ab492186…`, the v1.1 Senate-ratification receipt — a DIFFERENT root.
  // Nothing records an inscription of 0x716EA2F8 itself, and
  // genesis_inscription.rs carries no txid at all: the value is FNV-1a over
  // frozen anchors and is verified by recomputation, which needs no chain.
  //
  // "Not inscribed" is therefore a statement about this ONE value, not about
  // Omega's anchoring, and the assertion is scoped to omega's root line so it
  // cannot quietly grow into the broader claim.
  const o = await organism();
  const roots = o.four_roots as Array<Record<string, string>>;
  const omega = roots.find((r) => r.substrate === "omega");
  assert(omega, "omega root is missing");
  // The phrase must be ABSENT, not denied. A first version of this test wrote
  // "NOT Bitcoin-inscribed" into the output and then matched the substring — so
  // the assertion failed on its own denial. A check that cannot tell a claim
  // from its negation is not checking the claim.
  assert(
    !/Bitcoin[- ]inscribed|Bitcoin Genesis/i.test(omega!.root),
    `omega's root carries a Bitcoin-inscription claim: ${omega!.root}`,
  );
  assert(/deterministic|reproduc/i.test(omega!.root), omega!.root);
  assert(/recomputation/i.test(omega!.root), omega!.root);
});

Deno.test("x8F00 organism — no concrete law hash is copied into the output", async () => {
  // The mechanism that produced fourteen prose-only commits: a live-changing
  // value copied as static text. Any 0x-prefixed 8-hex law hash other than the
  // frozen Genesis is a copy that will go stale, so the shape is refused rather
  // than any particular stale value.
  const o = await organism();
  // proof_kind lives on the ORGANS, not on four_roots.
  const organs = o.organs as Array<Record<string, string>>;
  const omega = organs.find((r) => r.substrate === "omega");
  assert(omega, "omega organ is missing");
  const text = `${omega!.proof_kind} ${omega!.root}`;
  const hexes = text.match(/0x[0-9A-Fa-f]{8}/g) ?? [];
  assertEquals(
    hexes.filter((h) => h.toUpperCase() !== "0X716EA2F8"),
    [],
    `a non-Genesis hash is copied into the organism output: ${hexes}`,
  );
  assert(/law_hash\.rs/.test(text), "the live law source is not pointed at");
});
