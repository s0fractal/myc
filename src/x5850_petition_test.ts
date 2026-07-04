import { assert, assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1.1.4";
import {
  canonicalPetitionPayload,
  type PetitionEnvelope,
  submitPetition,
  validatePetition,
} from "./x5850_petition.ts";

function b64(u: Uint8Array): string {
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}

async function makeAgent() {
  const kp = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]) as CryptoKeyPair;
  const pub = b64(
    new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey)),
  );
  const sign = async (msg: string) =>
    b64(
      new Uint8Array(
        await crypto.subtle.sign(
          "Ed25519",
          kp.privateKey,
          new TextEncoder().encode(msg),
        ),
      ),
    );
  return { pub, sign };
}

const TS = 1_800_000_000;

/** A valid, correctly-signed petition envelope for the given agent. */
async function signed(
  agent: { pub: string; sign: (m: string) => Promise<string> },
  over: Partial<PetitionEnvelope> = {},
): Promise<PetitionEnvelope> {
  const e: PetitionEnvelope = {
    ref: "ipfs://bafyExampleReferenceCid",
    agent: agent.pub,
    ts: TS,
    nonce: "nonce-1",
    sig: "",
    ...over,
  };
  e.sig = await agent.sign(canonicalPetitionPayload(e));
  return e;
}

Deno.test("petition — a valid signed petition writes a DORMANT proposal (reference, not body)", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-petition-" });
  try {
    const a = await makeAgent();
    const e = await signed(a);
    const r = await submitPetition(root, e, { now: TS });
    assert(r.ok, "valid petition accepted");
    assertEquals(
      r.state,
      "dormant",
      "always dormant — the safety invariant is inherited",
    );
    assert(
      r.petition_id && r.petition_id.length === 64,
      "petition_id is a sha256",
    );
    const md = await Deno.readTextFile(
      join(root, "public", "proposals", r.fqdn!),
    );
    assert(md.includes('"state": "dormant"'), "descriptor is dormant");
    assert(md.includes(e.agent), "records the signing agent");
    assert(md.includes(e.ref), "records the reference");
    assert(
      !md.includes("spore_id"),
      "uses petition_id, never the spore_id homonym",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("petition — a duplicate petition_id is idempotent, not an error", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-petition-" });
  try {
    const a = await makeAgent();
    const e = await signed(a);
    const r1 = await submitPetition(root, e, { now: TS });
    const r2 = await submitPetition(root, e, { now: TS });
    assertEquals(r1.duplicate, false, "first submission is new");
    assert(r2.ok, "re-submission does not error");
    assertEquals(
      r2.duplicate,
      true,
      "re-submission is reported as a duplicate",
    );
    assertEquals(
      r1.petition_id,
      r2.petition_id,
      "same envelope → same petition_id",
    );
    assertEquals(r1.fqdn, r2.fqdn, "content-addressed → the same file");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("petition — an invalid signature is rejected before any write", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-petition-" });
  try {
    const a = await makeAgent();
    const other = await makeAgent();
    const e = await signed(a);
    // a signature by a DIFFERENT key over the same payload → well-formed but invalid
    const forged = { ...e, sig: await other.sign(canonicalPetitionPayload(e)) };
    const r = await submitPetition(root, forged, { now: TS });
    assert(!r.ok, "forged signature rejected");
    assert(r.error!.includes("signature"), "the reason names the signature");
    let wrote = false;
    try {
      for await (const _ of Deno.readDir(join(root, "public", "proposals"))) {
        wrote = true;
      }
    } catch { /* dir never created */ }
    assert(!wrote, "nothing is written when the signature fails");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("petition — an inline body is rejected; a ref must be a reference", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-petition-" });
  try {
    const a = await makeAgent();
    const e = await signed(a);
    const r = await submitPetition(root, e, {
      now: TS,
      inlineBody: "a whole document pasted inline",
    });
    assert(
      !r.ok && r.error!.includes("reference"),
      "an inline body is rejected",
    );

    const b = await makeAgent();
    const e2 = await signed(b, { ref: "this is prose, not a reference" });
    const r2 = await submitPetition(root, e2, { now: TS });
    assert(
      !r2.ok,
      "a ref containing whitespace (a body masquerading as a ref) is rejected",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("petition — standing is diagnostic-only and grants no rights", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-petition-" });
  try {
    const a = await makeAgent();
    const r = await submitPetition(root, await signed(a), { now: TS });
    assert(r.ok);
    assert(r.standing!.includes("diagnostic"), "standing is diagnostic");
    assert(r.standing!.includes("no rights"), "standing grants no rights");
    // the result surface exposes nothing that could mutate authority
    const keys = Object.keys(r);
    for (
      const forbidden of [
        "rights",
        "registry",
        "quorum",
        "citizen",
        "roadmap",
        "priority",
      ]
    ) {
      assert(
        !keys.includes(forbidden),
        `result must not carry a '${forbidden}' field`,
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("petition — a stale timestamp is rejected", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-petition-" });
  try {
    const a = await makeAgent();
    const e = await signed(a, { ts: 1000 });
    const r = await submitPetition(root, e, { now: TS });
    assert(
      !r.ok && r.error!.includes("timestamp"),
      "a stale timestamp is rejected",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("petition — validatePetition is a PURE gate (no fs): valid → petition_id, forged → error", async () => {
  const a = await makeAgent();
  const ok = await validatePetition(await signed(a), { now: TS });
  assert(
    ok.ok && ok.petition_id!.length === 64,
    "a valid envelope yields a petition_id",
  );

  const other = await makeAgent();
  const e = await signed(a);
  const forged = { ...e, sig: await other.sign(canonicalPetitionPayload(e)) };
  const bad = await validatePetition(forged, { now: TS });
  assert(
    !bad.ok && bad.error!.includes("signature"),
    "a forged signature is rejected",
  );

  const inline = await validatePetition(await signed(a), {
    now: TS,
    inlineBody: "x",
  });
  assert(
    !inline.ok && inline.error!.includes("reference"),
    "an inline body is rejected",
  );

  // same envelope → same petition_id (idempotency key is deterministic)
  const e2 = await signed(a);
  const a1 = await validatePetition(e2, { now: TS });
  const a2 = await validatePetition(e2, { now: TS });
  assertEquals(
    a1.petition_id,
    a2.petition_id,
    "petition_id is deterministic over the envelope",
  );
});
