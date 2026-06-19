import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyStanding,
  envelopeCommitment,
  SIGNATURE_DOMAIN,
  type TemporalAnchorReceipt,
  type TemporalSignatureEnvelope,
} from "./x2F60_temporal_envelope.ts";

const env = (
  over: Partial<TemporalSignatureEnvelope> = {},
): TemporalSignatureEnvelope => ({
  domain: SIGNATURE_DOMAIN,
  descriptor_commitment: "sha256:dddd",
  signer: "codex",
  key_timeline_root: "sha256:rrrr",
  nonce: "n1",
  ...over,
});
const receiptFor = async (
  e: TemporalSignatureEnvelope,
  over: Partial<TemporalAnchorReceipt> = {},
): Promise<TemporalAnchorReceipt> => ({
  type: "TemporalAnchorReceipt.v1",
  subject: `sha256:${await envelopeCommitment(e)}`,
  proof_kind: "opentimestamps",
  proof_commitment: "sha256:ots",
  bitcoin_block_height: 954500,
  bitcoin_block_hash: "00..",
  verifier: "ots:0.7",
  ...over,
});

Deno.test("temporal — NOTHING is ever proof_complete in this slice (no overclaim)", async () => {
  const e = env();
  for (
    const v of [
      await classifyStanding({}),
      await classifyStanding({ covers: "commitment" }),
      await classifyStanding({ covers: "envelope.v1", envelope: e }),
      await classifyStanding({ covers: "envelope.v1", envelope: e }, {
        anchor_receipt: await receiptFor(e),
      }),
    ]
  ) {
    // proof_complete is typed `false`; the Standing union has no anchored_valid /
    // historical_v1 member, so an overclaim is impossible by construction.
    assertEquals(v.proof_complete, false);
  }
});

Deno.test("temporal — v0 is current_registry_only; no content_sig is unsigned", async () => {
  assertEquals(
    (await classifyStanding({ covers: "commitment" })).standing,
    "current_registry_only",
  );
  assertEquals((await classifyStanding({})).standing, "unsigned");
});

Deno.test("temporal — a v1 envelope with a matching anchor receipt is at most temporal_candidate", async () => {
  const e = env();
  const v = await classifyStanding({ covers: "envelope.v1", envelope: e }, {
    anchor_receipt: await receiptFor(e),
  });
  assertEquals(v.standing, "temporal_candidate");
  assertEquals(v.anchored_by_height, 954500);
});

Deno.test("temporal — NEGATIVE: an anchor receipt for ANOTHER subject does not bind (codex P0.4)", async () => {
  const e = env();
  const other = env({ nonce: "different" });
  const wrong = await receiptFor(other); // subject is the OTHER envelope's commitment
  const v = await classifyStanding({ covers: "envelope.v1", envelope: e }, {
    anchor_receipt: wrong,
  });
  assertEquals(v.standing, "temporal_unanchored_candidate");
});

Deno.test("temporal — NEGATIVE: a v1 envelope with no anchor receipt is unanchored", async () => {
  const v = await classifyStanding(
    { covers: "envelope.v1", envelope: env() },
    {},
  );
  assertEquals(v.standing, "temporal_unanchored_candidate");
});

Deno.test("temporal — malformed v1 envelope fails closed", async () => {
  assertEquals(
    (await classifyStanding({
      covers: "envelope.v1",
      envelope: { domain: "wrong" },
    })).standing,
    "malformed",
  );
});

Deno.test("temporal — the signed envelope is NON-CIRCULAR: commitment binds no anchor", async () => {
  const e = env();
  // commitment changes with envelope fields...
  assert(
    await envelopeCommitment(e) !==
      await envelopeCommitment(env({ nonce: "n2" })),
  );
  assert(
    await envelopeCommitment(e) !==
      await envelopeCommitment(env({ key_timeline_root: "sha256:x" })),
  );
  // ...but is INDEPENDENT of any anchor: two different receipts attest the SAME bytes
  const c = await envelopeCommitment(e);
  const r1 = await receiptFor(e, { bitcoin_block_height: 954500 });
  const r2 = await receiptFor(e, { bitcoin_block_height: 960000 });
  assertEquals(r1.subject, `sha256:${c}`);
  assertEquals(r2.subject, `sha256:${c}`); // the envelope was not rewritten to be anchored
});

import { commitmentOf, type KeyEvent } from "./x2F70_keytimeline.ts";

Deno.test("temporal — a verified timeline reports chain_valid:true; advisory path is false", async () => {
  const e = env({ signer: "codex" });
  const receipt = await receiptFor(e, { bitcoin_block_height: 200 });
  // a minimal valid chain: genesis activate for codex, anchor verified.
  const genesis: KeyEvent = {
    principal: "codex",
    event: "activate",
    signing_key: "K0",
    custodian: "architect",
    issuer: "architect",
    sequence: 0,
    predecessor_commitment: null,
    valid_from: {
      kind: "bitcoin_block",
      height: 100,
      inclusion_receipt: "rcpt",
    },
    commitment: "",
  };
  genesis.commitment = await commitmentOf(genesis);
  const verified = await classifyStanding({
    covers: "envelope.v1",
    envelope: e,
  }, {
    anchor_receipt: receipt,
    timeline_events: [genesis],
    registry_root: { codex: "K0" },
    verify_signature: (_p, _c, _s) => true,
    verified_anchor_receipts: ["rcpt"],
  });
  assertEquals(verified.standing, "temporal_candidate");
  assertEquals(verified.chain_valid, true);
  assertEquals(verified.valid_at_anchor, true);
  assertEquals(verified.proof_complete, false); // anchor PROOF bytes still unverified (P2)
  // without a registry root + verifier, the same timeline is advisory only.
  const advisory = await classifyStanding({
    covers: "envelope.v1",
    envelope: e,
  }, {
    anchor_receipt: receipt,
    timeline_events: [genesis],
  });
  assertEquals(advisory.chain_valid, false);
});
