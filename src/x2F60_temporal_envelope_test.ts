import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyStanding,
  ENVELOPE_DOMAIN,
  envelopeCommitment,
  type TemporalEnvelopeV1,
} from "./x2F60_temporal_envelope.ts";

const env = (over: Partial<TemporalEnvelopeV1> = {}): TemporalEnvelopeV1 => ({
  domain: ENVELOPE_DOMAIN,
  descriptor_commitment: "sha256:dddd",
  signer: "codex",
  key_timeline_root: "sha256:rrrr",
  signing_anchor: {
    kind: "bitcoin_block",
    height: 954417,
    inclusion_receipt: "rcpt-1",
  },
  ...over,
});

Deno.test("temporal envelope — v0 signature is current_registry_only, never historical (codex #8)", async () => {
  const v = await classifyStanding({ covers: "commitment" });
  assertEquals(v.standing, "current_registry_only");
});

Deno.test("temporal envelope — v1 with an independently verified anchor is historical_v1", async () => {
  const v = await classifyStanding(
    { covers: "envelope.v1", envelope: env() },
    { verified_anchor_receipts: ["rcpt-1"] },
  );
  assertEquals(v.standing, "historical_v1");
});

Deno.test("temporal envelope — self-asserted anchor is never historical proof (codex #6)", async () => {
  // receipt not in the verified set
  const a = await classifyStanding(
    { covers: "envelope.v1", envelope: env() },
    { verified_anchor_receipts: ["other"] },
  );
  assertEquals(a.standing, "self_asserted");
  // no inclusion_receipt at all
  const b = await classifyStanding(
    {
      covers: "envelope.v1",
      envelope: env({
        signing_anchor: { kind: "bitcoin_block", height: 954417 },
      }),
    },
    { verified_anchor_receipts: ["rcpt-1"] },
  );
  assertEquals(b.standing, "self_asserted");
});

Deno.test("temporal envelope — no anchor verifier bundle is unavailable, never pass", async () => {
  const v = await classifyStanding(
    { covers: "envelope.v1", envelope: env() },
    null,
  );
  assertEquals(v.standing, "unavailable");
});

Deno.test("temporal envelope — commitment binds anchor height and timeline root (codex #1, #2)", async () => {
  const base = await envelopeCommitment(env());
  assert(
    base !==
      await envelopeCommitment(
        env({
          signing_anchor: {
            kind: "bitcoin_block",
            height: 999999,
            inclusion_receipt: "rcpt-1",
          },
        }),
      ),
  );
  assert(
    base !==
      await envelopeCommitment(env({ key_timeline_root: "sha256:other" })),
  );
  assert(
    base !==
      await envelopeCommitment(env({ descriptor_commitment: "sha256:other" })),
  );
});

Deno.test("temporal envelope — malformed v1 envelope fails closed to unavailable", async () => {
  const v = await classifyStanding(
    { covers: "envelope.v1", envelope: { domain: "wrong" } },
    { verified_anchor_receipts: ["rcpt-1"] },
  );
  assertEquals(v.standing, "unavailable");
});

Deno.test("temporal envelope — historical_v1 resolves valid_at_signing against the timeline (step 4)", async () => {
  const events = [
    {
      principal: "codex",
      event: "activate" as const,
      signing_key: "K0",
      sequence: 0,
      predecessor_commitment: null,
      valid_from: { kind: "bitcoin_block" as const, height: 954000 },
    },
    {
      principal: "codex",
      event: "revoke" as const,
      signing_key: "K0",
      sequence: 1,
      predecessor_commitment: null,
      valid_from: { kind: "bitcoin_block" as const, height: 955000 },
      compromised_since: { kind: "bitcoin_block" as const, height: 954500 },
    },
  ];
  // anchor at 954417: after activation, BEFORE the compromise point → trusted
  const ok = await classifyStanding(
    { covers: "envelope.v1", envelope: env({ signer: "codex" }) },
    { verified_anchor_receipts: ["rcpt-1"], timeline_events: events },
  );
  assertEquals(ok.standing, "historical_v1");
  assertEquals(ok.valid_at_signing, true);
  assertEquals(ok.trusted_now, true);
  // anchor after compromised_since → valid at signing, but trust withdrawn
  const compromised = await classifyStanding(
    {
      covers: "envelope.v1",
      envelope: env({
        signer: "codex",
        signing_anchor: {
          kind: "bitcoin_block",
          height: 954600,
          inclusion_receipt: "rcpt-1",
        },
      }),
    },
    { verified_anchor_receipts: ["rcpt-1"], timeline_events: events },
  );
  assertEquals(compromised.valid_at_signing, true);
  assertEquals(compromised.trusted_now, false);
});
