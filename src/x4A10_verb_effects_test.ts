import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { shellCommandNames } from "./x01E0_cli.ts";
import { localCommandNames } from "./x01F0_local_commands.ts";
import { classify, VERB_EFFECTS } from "./x4A10_verb_effects.ts";

Deno.test("x4A10 — effect projection exactly covers executable commands", () => {
  const executable = [
    ...new Set([
      ...shellCommandNames(),
      ...localCommandNames(),
      "help",
    ]),
  ].sort();
  assertEquals(Object.keys(VERB_EFFECTS).sort(), executable);
});

Deno.test("x4A10 — the read surfaces are typed read (no write/net)", () => {
  for (
    const v of ["organism", "trust", "lifecycle", "coord", "resolve", "verify"]
  ) {
    assertEquals(classify(v), "read", `${v} must be read`);
  }
});

Deno.test("x4A10 — the mutating verbs are typed effect", () => {
  for (
    const v of [
      "capture",
      "publish",
      "witness",
      "review",
      "import",
      "reproject",
    ]
  ) {
    assertEquals(classify(v), "effect", `${v} must be effect`);
  }
});

Deno.test("x4A10 — serve is the only net verb", () => {
  assertEquals(classify("serve"), "serve");
  const nets = Object.entries(VERB_EFFECTS).filter(([, e]) => e === "serve");
  assertEquals(nets.map(([v]) => v), ["serve"]);
});

Deno.test("x4A10 — coord --stamp escalates read → effect", () => {
  assertEquals(classify("coord"), "read");
  assertEquals(classify("coord", ["x0000", "--stamp", "s0fractal"]), "effect");
});

Deno.test("x4A10 — unknown verbs fail closed to read", () => {
  assertEquals(classify("totally-unknown-verb"), "read");
});
