import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyTemporal } from "./x2FA0_temporal_verify.ts";

const ENV = new URL(
  "../public/temporal/codex-x2d00-954422.envelope.json",
  import.meta.url,
).pathname;

Deno.test("temporal-verify — end-to-end on codex's real envelope (no anchor → unanchored, never overclaimed)", async () => {
  const sigFile = new URL(
    "../public/temporal/codex-x2d00-954422.signature.json",
    import.meta.url,
  ).pathname;
  const sig = JSON.parse(await Deno.readTextFile(sigFile)).signature;
  const v = await verifyTemporal(ENV, sig); // no anchor
  assertEquals(
    v.envelope_commitment,
    "79dd965fbfcd43776a9f760185b24e09fdcd3cf2a69065ac499f1944d1cd5831",
  );
  assertEquals(v.signer, "codex");
  assertEquals(v.standing, "temporal_unanchored_candidate");
  assertEquals(v.fully_anchored, false); // NEVER anchored without a verified proof
  assertEquals(typeof v.signature_valid, "boolean");
});

Deno.test("temporal-verify — a wrong signature never verifies, never anchors", async () => {
  const v = await verifyTemporal(ENV, "AAAA"); // garbage signature
  assertEquals(v.signature_valid, false);
  assertEquals(v.fully_anchored, false);
  assertEquals(v.ok, false);
});
