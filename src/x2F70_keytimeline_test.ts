import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  forkedPrincipals,
  type KeyEvent,
  keyStateAt,
  resolveKeyState,
} from "./x2F70_keytimeline.ts";

const blk = (height: number) => ({ kind: "bitcoin_block" as const, height });
const ev = (over: Partial<KeyEvent>): KeyEvent => ({
  principal: "p",
  event: "activate",
  signing_key: "K0",
  sequence: 0,
  predecessor_commitment: null,
  valid_from: blk(100),
  ...over,
});

// SHARED PARITY SCENARIO — Trinity x2B00 pins the same verdicts (keytimeline_test).
const COMPROMISE = [
  ev({}),
  ev({
    event: "revoke",
    sequence: 1,
    valid_from: blk(200),
    compromised_since: blk(150),
  }),
];

Deno.test("x2F70 keytimeline — compromised_since withdraws trust per its anchor (codex #4, PARITY)", () => {
  // before the compromise point: valid AND still trusted
  const before = keyStateAt(COMPROMISE, "p", blk(120));
  assertEquals(before.valid_at_signing, true);
  assertEquals(before.trusted_now, true);
  assertEquals(before.signing_key, "K0");
  // at/after compromised_since: valid at signing, but trust withdrawn retroactively
  const after = keyStateAt(COMPROMISE, "p", blk(160));
  assertEquals(after.valid_at_signing, true);
  assertEquals(after.trusted_now, false);
});

Deno.test("x2F70 keytimeline — rotation preserves a pre-rotation verdict (codex #3)", () => {
  const chain = [
    ev({}),
    ev({
      event: "rotate",
      signing_key: "K1",
      sequence: 1,
      valid_from: blk(200),
    }),
  ];
  const pre = keyStateAt(chain, "p", blk(150));
  assertEquals(pre.signing_key, "K0"); // the old anchor is unaffected by the later rotate
  assertEquals(pre.valid_at_signing, true);
});

Deno.test("x2F70 keytimeline — a forked principal is suspended, never branch-picked (codex #5)", () => {
  const forked = [
    ev({ sequence: 0 }),
    ev({ sequence: 0, signing_key: "K-evil" }),
  ];
  assertEquals(forkedPrincipals(forked), ["p"]);
  const ks = resolveKeyState(forked, "p", blk(120));
  assertEquals(ks.suspended, true);
  assertEquals(ks.valid_at_signing, false);
});

Deno.test("x2F70 keytimeline — anchors of different kinds never silently compare", () => {
  const wall = [ev({ valid_from: { kind: "wall_clock", iso: "2026-01-01" } })];
  // a bitcoin_block anchor cannot be placed in a wall_clock window → no key active
  assertEquals(keyStateAt(wall, "p", blk(120)).valid_at_signing, false);
});
