import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ChainVerificationOptions,
  commitmentOf,
  type KeyEvent,
  keyStateAt,
  type SignatureVerifier,
  verifyAndResolve,
  verifyChain,
} from "./x2F70_keytimeline.ts";

const blk = (height: number) => ({
  kind: "bitcoin_block" as const,
  height,
  inclusion_receipt: "rcpt",
});
const RCPTS = new Set(["rcpt"]);
// a mock verifier: a valid signature for key K over commitment C is "sig:K".
const verifySignature: SignatureVerifier = (pub, _c, sig) =>
  sig === `sig:${pub}`;
const OPTS = (
  registryRoot: Record<string, string>,
): ChainVerificationOptions => ({
  registryRoot,
  verifySignature,
  verifiedAnchorReceipts: RCPTS,
});

async function ev(p: Partial<KeyEvent>): Promise<KeyEvent> {
  const base: KeyEvent = {
    principal: "p",
    event: "activate",
    signing_key: "K0",
    custodian: "architect",
    issuer: "architect",
    sequence: 0,
    predecessor_commitment: null,
    valid_from: blk(100),
    commitment: "",
    ...p,
  };
  base.commitment = await commitmentOf(base);
  return base;
}
// link events into an authorized chain (predecessor + sequence + signatures).
async function chain(...parts: Array<Partial<KeyEvent>>): Promise<KeyEvent[]> {
  const out: KeyEvent[] = [];
  let activeKey = parts[0].signing_key ?? "K0";
  for (let i = 0; i < parts.length; i++) {
    const pred = i === 0 ? null : out[i - 1].commitment;
    const e = await ev({
      ...parts[i],
      sequence: i,
      predecessor_commitment: pred,
    });
    if (i > 0) {
      e.authorization = {
        predecessor_signature: `sig:${activeKey}`,
        ...(e.event === "rotate" || e.event === "delegate"
          ? { subject_signature: `sig:${e.signing_key}` }
          : {}),
      };
      e.commitment = await commitmentOf(e); // commitment excludes authorization
    }
    if (e.event === "rotate") activeKey = e.signing_key;
    out.push(e);
  }
  return out;
}

Deno.test("verifyChain — a well-formed authorized chain is valid", async () => {
  const c = await chain(
    { event: "activate", signing_key: "K0" },
    { event: "rotate", signing_key: "K1" },
  );
  const v = await verifyChain(c, OPTS({ p: "K0" }));
  assert(v.valid, v.errors.join("; "));
});

Deno.test("verifyChain — a tampered commitment is rejected", async () => {
  const c = await chain({ event: "activate", signing_key: "K0" });
  c[0].commitment = "deadbeef"; // tamper
  const v = await verifyChain(c, OPTS({ p: "K0" }));
  assert(!v.valid);
  assert(v.errors.some((e) => e.includes("commitment does not bind body")));
});

Deno.test("verifyChain — genesis must match the pinned registry root", async () => {
  const c = await chain({ event: "activate", signing_key: "K0" });
  const v = await verifyChain(c, OPTS({ p: "WRONG" }));
  assert(!v.valid);
  assert(v.errors.some((e) => e.includes("registry root")));
});

Deno.test("verifyChain — a forged predecessor authorization is rejected", async () => {
  const c = await chain(
    { event: "activate", signing_key: "K0" },
    { event: "rotate", signing_key: "K1" },
  );
  c[1].authorization = {
    predecessor_signature: "sig:ATTACKER",
    subject_signature: "sig:K1",
  };
  c[1].commitment = await commitmentOf(c[1]);
  const v = await verifyChain(c, OPTS({ p: "K0" }));
  assert(!v.valid);
  assert(
    v.errors.some((e) => e.includes("predecessor authorization is invalid")),
  );
});

Deno.test("verifyChain — a self-asserted (unverified) anchor is rejected", async () => {
  const c = await chain({
    event: "activate",
    signing_key: "K0",
    valid_from: { kind: "bitcoin_block", height: 100 },
  });
  const v = await verifyChain(c, OPTS({ p: "K0" }));
  assert(!v.valid);
  assert(v.errors.some((e) => e.includes("not independently verified")));
});

Deno.test("verifyChain — a forked principal is suspended, never adjudicated", async () => {
  const a = await ev({ event: "activate", signing_key: "K0", sequence: 0 });
  const b = await ev({ event: "activate", signing_key: "K-evil", sequence: 0 });
  const v = await verifyChain([a, b], OPTS({ p: "K0" }));
  assertEquals(v.suspended, ["p"]);
  assert(!v.valid);
});

Deno.test("verifyAndResolve — resolves key state only from a VALID chain", async () => {
  const good = await chain({ event: "activate", signing_key: "K0" });
  const ok = await verifyAndResolve(good, "p", blk(150), OPTS({ p: "K0" }));
  assert(ok.chain.valid);
  assertEquals(ok.state.valid_at_signing, true);
  // an invalid chain yields no resolution
  good[0].commitment = "tampered";
  const bad = await verifyAndResolve(good, "p", blk(150), OPTS({ p: "K0" }));
  assert(!bad.chain.valid);
  assertEquals(bad.state.valid_at_signing, false);
});

Deno.test("keyStateAt — compromised_since verdicts (PARITY with trinity x2B00)", async () => {
  const events = [
    await ev({ signing_key: "K0", sequence: 0, valid_from: blk(100) }),
    await ev({
      event: "revoke",
      signing_key: "K0",
      sequence: 1,
      valid_from: blk(200),
      compromised_since: blk(150),
    }),
  ];
  const before = keyStateAt(events, "p", blk(120));
  assertEquals(before.valid_at_signing, true);
  assertEquals(before.trusted_now, true);
  const after = keyStateAt(events, "p", blk(160));
  assertEquals(after.trusted_now, false);
});
