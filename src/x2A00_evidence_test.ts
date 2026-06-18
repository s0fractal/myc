import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { verifyEvidence } from "./x2A00_evidence.ts";

const MYC_ROOT = dirname(dirname(fromFileUrl(import.meta.url)));

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stable(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  return `{${
    Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")
  }}`;
}
async function commit(body: Json): Promise<string> {
  return await commitText(stable(body));
}
async function commitText(text: string): Promise<string> {
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

const FULL = "a".repeat(40);

Deno.test("x2A00 — commit: syntax alone does not prove object existence", async () => {
  const r = await verifyEvidence({
    kind: "commit",
    ref: FULL,
    commitment: FULL,
  });
  assert(!r.valid);
  assert(/existence is not proven/.test(r.reason));
});

Deno.test("x2A00 — commit: an ABBREVIATED git ref is invalid", async () => {
  const r = await verifyEvidence({
    kind: "commit",
    ref: "40b667f",
    commitment: "40b667f",
  });
  assert(!r.valid);
  assert(/abbreviated|non-canonical/.test(r.reason));
});

Deno.test("x2A00 — commit: commitment != object id is invalid", async () => {
  const r = await verifyEvidence({
    kind: "commit",
    ref: FULL,
    commitment: "b".repeat(40),
  });
  assert(!r.valid);
});

Deno.test("x2A00 — unknown evidence kind is invalid", async () => {
  const r = await verifyEvidence({ kind: "built", ref: "x", commitment: "y" });
  assert(!r.valid);
  assert(/unknown evidence kind/.test(r.reason));
});

Deno.test("x2A00 — empty ref or commitment is invalid", async () => {
  assert(
    !(await verifyEvidence({ kind: "commit", ref: "", commitment: FULL }))
      .valid,
  );
  assert(
    !(await verifyEvidence({ kind: "commit", ref: FULL, commitment: "" }))
      .valid,
  );
});

Deno.test("x2A00 — descriptor: resolves, self-verifies, commitment matches → valid", async () => {
  const root = await Deno.makeTempDir({ prefix: "ev_" });
  try {
    const body = { publish_clearance: { target_fqdn: "t" }, destinations: [] };
    const c = await commit(body as Json);
    const fqdn = "h.realpub.publish.myc.md";
    const dir = join(root, "public", "consensus", "publish");
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      join(dir, fqdn),
      "---\nx: 1\n---\n\n```json myc\n" +
        JSON.stringify(
          {
            type: "PublishDescriptor",
            fqdn,
            commitment: {
              algorithm: "sha256",
              value: c,
              covers: "descriptor.body",
            },
            body,
          },
          null,
          2,
        ) +
        "\n```\n",
    );
    const ok = await verifyEvidence({
      kind: "publish",
      ref: fqdn,
      commitment: c,
    }, { root });
    assert(ok.valid, ok.reason);
    // wrong commitment for a real descriptor → invalid
    const bad = await verifyEvidence({
      kind: "publish",
      ref: fqdn,
      commitment: "z".repeat(64),
    }, { root });
    assert(!bad.valid);
    // absent target → invalid
    const miss = await verifyEvidence({
      kind: "publish",
      ref: "h.nope.publish.myc.md",
      commitment: c,
    }, { root });
    assert(!miss.valid);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("x2A00 — apply: raw SPORE record, hashes and fuel are verified", async () => {
  const sporeId =
    "14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688";
  const ok = await verifyEvidence({
    kind: "apply",
    ref: "receipt.14b5a247729c.myc.md",
    commitment: sporeId,
  }, { root: MYC_ROOT });
  assert(ok.valid, ok.reason);
  const bad = await verifyEvidence({
    kind: "apply",
    ref: "receipt.14b5a247729c.myc.md",
    commitment: "b".repeat(64),
  }, { root: MYC_ROOT });
  assert(!bad.valid);
});

Deno.test("x2A00 — phase: deterministic PHI receipt signature is verified", async () => {
  const intent =
    "f6ad91ee19648111896148725cf4b46d7eeaec0124987ff1e50bacef5d5680e5";
  const ok = await verifyEvidence({
    kind: "phase",
    ref: "receipt.57b246e1de5a.myc.md",
    commitment: intent,
  }, { root: MYC_ROOT });
  assert(ok.valid, ok.reason);
  const bad = await verifyEvidence({
    kind: "phase",
    ref: "receipt.57b246e1de5a.myc.md",
    commitment: "b".repeat(64),
  }, { root: MYC_ROOT });
  assert(!bad.valid);
});

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

Deno.test("x2A00 — chord: filename + body + Ed25519 bind; tampering fails", async () => {
  const superproject = await Deno.makeTempDir({ prefix: "ev_chord_" });
  try {
    const keys = await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ]) as CryptoKeyPair;
    const publicKey = new Uint8Array(
      await crypto.subtle.exportKey("raw", keys.publicKey),
    );
    const src = join(superproject, "src");
    await Deno.mkdir(src, { recursive: true });
    await Deno.writeTextFile(
      join(src, "x2F38_voice_pubkeys.json"),
      JSON.stringify({ keys: { alpha: { pubkey: b64(publicKey) } } }),
    );
    const filename = "x7700_test_alpha.myc.md";
    const body = "# Bound chord\n\nA decision.\n";
    const payload = `sha256:${await commitText(`${filename}\n${body}`)}`;
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        "Ed25519",
        keys.privateKey,
        new TextEncoder().encode(payload),
      ),
    );
    const chord =
      `---\ncontent_sig:\n  voice: alpha\n  alg: ed25519\n  payload: "${payload}"\n` +
      `  sig: "${b64(signature)}"\n---\n${body}`;
    const path = join(src, filename);
    await Deno.writeTextFile(path, chord);
    const evidence = {
      kind: "chord",
      ref: filename,
      commitment: payload,
    };
    const ok = await verifyEvidence(evidence, { superproject });
    assert(ok.valid, ok.reason);

    await Deno.writeTextFile(path, chord.replace("A decision.", "A mutation."));
    const tampered = await verifyEvidence(evidence, { superproject });
    assert(!tampered.valid);
    assert(/does not bind/.test(tampered.reason));
  } finally {
    await Deno.remove(superproject, { recursive: true });
  }
});

Deno.test("x2A00 — omega proof verification is honestly deferred (invalid in v0)", async () => {
  const r = await verifyEvidence({
    kind: "omega",
    ref: "0x30A95260",
    commitment: "x",
  });
  assert(!r.valid);
  assert(/deferred/.test(r.reason));
});
