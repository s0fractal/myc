import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { intentCommitment, validateIntent } from "./x5820_action_intent.ts";

// SHARED PARITY VECTOR — Trinity x5E10 pins the same value (warrant_test.ts). If
// either side's algorithm drifts, exactly one of these tests fails. This is the
// cross-substrate parity guard, with no cross-substrate import.
const VECTOR = {
  verb: "apply",
  target_substrate: "myc" as const,
  args_commitment: "c1",
  input_commitments: ["a", "b"],
  requested_effects: ["receipt", "write"],
};
const EXPECTED =
  "d02d75adca7e0dbbd10244c7ea1e9aeafa7b6d019a0f570bcad471a38d997552";

Deno.test("x5820 action_intent — canonical commitment matches the shared vector", async () => {
  assertEquals(await intentCommitment(VECTOR), EXPECTED);
});

Deno.test("x5820 action_intent — effects are a set, input order is significant", async () => {
  assertEquals(
    await intentCommitment({
      ...VECTOR,
      requested_effects: ["write", "receipt"],
    }),
    EXPECTED,
  );
  assert(
    await intentCommitment({ ...VECTOR, input_commitments: ["b", "a"] }) !==
      EXPECTED,
  );
});

Deno.test("x5820 action_intent — validateIntent fails closed on malformed input", () => {
  assert(!validateIntent(null).ok);
  assert(
    !validateIntent({
      verb: "",
      target_substrate: "myc",
      args_commitment: "",
      input_commitments: [],
      requested_effects: [],
    }).ok,
  );
  assert(
    !validateIntent({
      verb: "x",
      target_substrate: "mars",
      args_commitment: "",
      input_commitments: [],
      requested_effects: [],
    }).ok,
  );
  assert(
    !validateIntent({
      verb: "x",
      target_substrate: "myc",
      args_commitment: "c",
      input_commitments: [1],
      requested_effects: [],
    }).ok,
  );
  assert(validateIntent(VECTOR).ok);
});
