// myc/src/shared/envelope_vendor_test.ts — the vendored ReceiptEnvelope encoder
// must keep producing self-consistent envelopes so myc's substrate_tag:myc
// witness verifies in the trinity Substrate Court. Gated by the `check` task
// (run in CI) and `test`.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ENVELOPE_SCHEMA, wrap } from "./envelope.ts";
import { encodeCanonical, multihashSha256 } from "./canonical_cbor.ts";

Deno.test("myc vendored wrap — schema-correct, law-abstaining witness", async () => {
  const body = {
    type: "SubstrateHealth",
    substrate: "myc",
    overall: "healthy",
    law_hash: null,
  };
  const env = await wrap(body, "substrate_health", "myc", {});
  assertEquals(env.schema, ENVELOPE_SCHEMA);
  assertEquals(env.substrate_tag, "myc");
  assertEquals(env.body_kind, "substrate_health");
  assert(env.law_hash === undefined || env.law_hash === null);
  assert(env.envelope_id.length > 0);
});

Deno.test("myc vendored wrap — body_hash matches the court's recompute", async () => {
  const body = { type: "SubstrateHealth", substrate: "myc", n: 11 };
  const env = await wrap(body, "substrate_health", "myc", {});
  assertEquals(env.body_hash, await multihashSha256(encodeCanonical(body)));
});
