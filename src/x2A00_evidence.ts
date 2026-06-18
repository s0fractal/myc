#!/usr/bin/env -S deno run --allow-read --allow-env
// myc/src/x2A00_evidence.ts — the evidence verifier boundary. position: 2/A →
// mirror(2) × resonance(A) = reflect a claimed reference back onto a real object.
// placement_policy: axis
//
// Codex critique x2900_954260: "evidence presence is not proof." A resolution's
// evidence_refs must be RESOLVED and commitment-checked, not merely counted. This
// is the one pure, read-only verifier boundary: given {kind, ref, commitment} it
// resolves the referenced object and returns a typed verdict. Unknown kinds,
// missing targets, abbreviated/ambiguous ids, empty or mismatched commitments are
// INVALID and visible — they never contribute to finality. Lower bucket than the
// lifecycle (3) so the projection composes it downward (coordinate-gravity law).

import { basename, dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { blake3 } from "npm:@noble/hashes@1.4.0/blake3";
import { verifyCommitment } from "./x2F50_voice_auth.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);
const SUPERPROJECT = dirname(MYC_ROOT);

export interface EvidenceRef {
  kind: string;
  ref: string;
  commitment: string;
}
export interface EvidenceVerdict {
  ref: string;
  kind: string;
  valid: boolean;
  canonical_identity?: string;
  proof_kind: string;
  reason: string;
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stableStringify(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  return `{${
    Object.keys(v).sort().map((k) =>
      `${JSON.stringify(k)}:${stableStringify(v[k])}`
    )
      .join(",")
  }}`;
}
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  )
    .join("");
}
function norm(commitment: string): string {
  return commitment.replace(/^sha256:/, "").trim();
}

function hexBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function chordBody(text: string): string | null {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? text.slice(m[0].length) : null;
}

function contentSig(
  text: string,
): { voice: string; payload: string; sig: string } | null {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const block = fm?.[1].match(/content_sig:\n((?: {2}.*\n?)+)/)?.[1];
  if (!block) return null;
  const voice = block.match(/voice:\s*(\S+)/)?.[1];
  const payload = block.match(/payload:\s*"([^"]+)"/)?.[1];
  const sig = block.match(/sig:\s*"([^"]+)"/)?.[1];
  return voice && payload && sig ? { voice, payload, sig } : null;
}

function readDigest(
  record: Uint8Array,
  offset: number,
): { digest: string; next: number } | null {
  if (
    offset + 34 > record.length || record[offset] !== 0x1e ||
    record[offset + 1] !== 32
  ) {
    return null;
  }
  return {
    digest: toHex(record.slice(offset + 2, offset + 34)),
    next: offset + 34,
  };
}

/** Verify the imported SPORE descriptor against the raw apply record it carries. */
function verifySporeReceipt(
  text: string,
): { ok: boolean; reason: string; id?: string } {
  const status = frontmatterField(text, "status");
  const verified = frontmatterField(text, "record_verified");
  const fuelModel = frontmatterField(text, "fuel_model");
  const sporeId = frontmatterField(text, "spore_id") ?? "";
  const mutator = frontmatterField(text, "mutator_hash") ?? "";
  const output = frontmatterField(text, "output_hash") ?? "";
  const totalFuel = Number(frontmatterField(text, "total_fuel"));
  const bodyFuel = Number(text.match(/\(Body:\s*(\d+)\s*ATP\)/)?.[1]);
  const rawHex = text.match(/```hex\s*\n([0-9a-f]+)\n```/i)?.[1] ?? "";
  const record = hexBytes(rawHex);
  if (
    status !== "APPLIED" || verified !== "true" || fuelModel !== "spore.fuel.v1"
  ) {
    return {
      ok: false,
      reason: "receipt is not an APPLIED, record-verified spore.fuel.v1 record",
    };
  }
  if (!record || !/^[0-9a-f]{64}$/.test(sporeId) || record.length < 9) {
    return {
      ok: false,
      reason: "missing or malformed raw SPORE record/spore_id",
    };
  }
  if (toHex(record.slice(0, 6)) !== "53504f520001") {
    return { ok: false, reason: "bad SPORE apply magic/version/kind" };
  }
  const computed = toHex(
    blake3(record, { context: "spore.apply.v0", dkLen: 32 }),
  );
  if (computed !== sporeId) {
    return { ok: false, reason: "spore_id does not bind raw record" };
  }
  const argc = record[8];
  let offset = 9;
  const f = readDigest(record, offset);
  if (!f) return { ok: false, reason: "malformed mutator multihash" };
  offset = f.next;
  for (let i = 0; i < argc; i++) {
    const arg = readDigest(record, offset);
    if (!arg) return { ok: false, reason: `malformed argument multihash ${i}` };
    offset = arg.next;
  }
  const expected = readDigest(record, offset);
  if (!expected || expected.next !== record.length) {
    return {
      ok: false,
      reason: "malformed/trailing expected-output multihash",
    };
  }
  if (f.digest !== mutator || expected.digest !== output) {
    return {
      ok: false,
      reason: "raw record does not bind mutator/output hashes",
    };
  }
  if (!Number.isSafeInteger(bodyFuel) || totalFuel !== bodyFuel + 4 + argc) {
    return {
      ok: false,
      reason: "fuel accounting does not match body + apply boundary",
    };
  }
  return {
    ok: true,
    reason: "raw SPORE record, hashes and fuel verify",
    id: sporeId,
  };
}

/** Verify the deterministic PHI receipt signature emitted by omega's fixture law. */
async function verifyPhaseReceipt(
  text: string,
): Promise<{ ok: boolean; reason: string; id?: string }> {
  const intent = frontmatterField(text, "intent_hash") ?? "";
  const status = frontmatterField(text, "status") ?? "";
  const phase = Number(frontmatterField(text, "derived_phase"));
  const timestamp = Number(text.match(/\*\*Timestamp\*\*:\s*(\d+)/)?.[1]);
  const signature = frontmatterField(text, "signature") ?? "";
  if (!/^[0-9a-f]{64}$/.test(intent) || status !== "ACCEPTED") {
    return { ok: false, reason: "phase receipt has invalid intent/status" };
  }
  if (
    !Number.isSafeInteger(phase) || phase < 0 || phase > 65535 ||
    !Number.isSafeInteger(timestamp)
  ) {
    return { ok: false, reason: "phase receipt has invalid phase/timestamp" };
  }
  const receipt = {
    type: "PHI_RECEIPT",
    version: "0.1",
    intent_hash: intent,
    status,
    derived_phase: phase,
    timestamp,
  };
  const expected = await sha256Hex(JSON.stringify(receipt));
  if (signature !== expected) {
    return {
      ok: false,
      reason: "phase receipt signature does not bind deterministic receipt",
    };
  }
  return {
    ok: true,
    reason: "deterministic PHI receipt signature verifies",
    id: intent,
  };
}

/** Walk a directory tree (depth-limited) for a file whose name === or startsWith ref. */
function findFile(dir: string, ref: string, depth = 6): string | null {
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return null;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isFile) {
      if (e.name === ref || e.name === `${ref}.myc.md`) return p;
    }
  }
  // exact miss → allow a unique prefix match at this level (coordinate stems)
  const pref = entries.filter((e) => e.isFile && e.name.startsWith(ref));
  if (pref.length === 1) return join(dir, pref[0].name);
  if (depth > 0) {
    for (const e of entries) {
      if (e.isDirectory) {
        const hit = findFile(join(dir, e.name), ref, depth - 1);
        if (hit) return hit;
      }
    }
  }
  return null;
}

function descriptorBlock(text: string): Record<string, unknown> | null {
  const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}
function frontmatterField(text: string, field: string): string | null {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  return fm[1].match(new RegExp(`${field}:\\s*"?([^"\\n]+)"?`))?.[1]?.trim() ??
    null;
}

const v = (
  kind: string,
  ref: string,
  valid: boolean,
  proof_kind: string,
  reason: string,
  canonical_identity?: string,
): EvidenceVerdict => ({
  kind,
  ref,
  valid,
  proof_kind,
  reason,
  canonical_identity,
});

/** Resolve and verify one evidence reference. Pure + read-only. */
export async function verifyEvidence(
  e: EvidenceRef,
  ctx: { root?: string; superproject?: string } = {},
): Promise<EvidenceVerdict> {
  const root = ctx.root ?? MYC_ROOT;
  const superproject = ctx.superproject ?? SUPERPROJECT;
  if (!e.ref || !e.commitment) {
    return v(e.kind, e.ref, false, "none", "empty ref or commitment");
  }

  switch (e.kind) {
    case "commit": {
      // A read-only membrane cannot prove that an arbitrary Git object exists
      // without a committed index/receipt. A syntactically canonical id is a
      // pointer, not proof, so commit refs remain invalid evidence here.
      if (!/^[0-9a-f]{40}$/.test(e.ref)) {
        return v(
          e.kind,
          e.ref,
          false,
          "git-object-id",
          "abbreviated or non-canonical git object id (need full 40-hex)",
        );
      }
      if (norm(e.commitment) !== e.ref) {
        return v(
          e.kind,
          e.ref,
          false,
          "git-object-id",
          "commitment must equal the full git object id",
        );
      }
      return v(
        e.kind,
        e.ref,
        false,
        "git-object-id",
        "canonical git id, but object existence is not proven by a tracked evidence receipt",
        e.ref,
      );
    }

    case "chord": {
      const path = findFile(join(superproject, "src"), e.ref);
      if (!path) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "chord not found in superproject/src",
        );
      }
      const text = await Deno.readTextFile(path);
      const signed = contentSig(text);
      const body = chordBody(text);
      if (!signed || body === null) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "chord has no complete content_sig/body to bind",
        );
      }
      const recomputed = `sha256:${await sha256Hex(
        `${basename(path)}\n${body}`,
      )}`;
      if (signed.payload !== recomputed) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "chord payload does not bind filename + body",
          norm(recomputed),
        );
      }
      if (norm(signed.payload) !== norm(e.commitment)) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "commitment does not match the chord's content identity",
          norm(signed.payload),
        );
      }
      const sigOk = await verifyCommitment(
        signed.voice,
        signed.payload,
        signed.sig,
        superproject,
      );
      if (!sigOk) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "chord content signature is absent from registry or invalid",
          norm(signed.payload),
        );
      }
      return v(
        e.kind,
        e.ref,
        true,
        "chord-content-sig",
        "chord payload recomputed and Ed25519 signature verified",
        norm(signed.payload),
      );
    }

    case "apply":
    case "phase": {
      const sub = e.kind === "apply" ? "spore" : "liquid";
      const path = findFile(join(root, "substrates", sub, "receipts"), e.ref);
      if (!path) {
        return v(
          e.kind,
          e.ref,
          false,
          `${sub}-receipt`,
          `${sub} receipt not found`,
        );
      }
      const text = await Deno.readTextFile(path);
      const checked = e.kind === "apply"
        ? verifySporeReceipt(text)
        : await verifyPhaseReceipt(text);
      if (!checked.ok || !checked.id) {
        return v(
          e.kind,
          e.ref,
          false,
          `${sub}-receipt`,
          checked.reason,
        );
      }
      if (norm(checked.id) !== norm(e.commitment)) {
        return v(
          e.kind,
          e.ref,
          false,
          `${sub}-receipt`,
          "commitment does not match the receipt identity",
          norm(checked.id),
        );
      }
      return v(
        e.kind,
        e.ref,
        true,
        `${sub}-receipt`,
        checked.reason,
        norm(checked.id),
      );
    }

    case "publish":
    case "review":
    case "proposal":
    case "descriptor": {
      const path = findFile(join(root, "public"), e.ref);
      if (!path) {
        return v(
          e.kind,
          e.ref,
          false,
          "descriptor-commitment",
          "descriptor not found under public/",
        );
      }
      const d = descriptorBlock(await Deno.readTextFile(path));
      const claimed = (d?.commitment as Record<string, unknown>)
        ?.value as string;
      if (!d || !claimed) {
        return v(
          e.kind,
          e.ref,
          false,
          "descriptor-commitment",
          "no commitment in the referenced descriptor",
        );
      }
      const recomputed = await sha256Hex(stableStringify(d.body as Json));
      if (recomputed !== claimed) {
        return v(
          e.kind,
          e.ref,
          false,
          "descriptor-commitment",
          "referenced descriptor fails its own integrity check",
        );
      }
      if (norm(e.commitment) !== claimed) {
        return v(
          e.kind,
          e.ref,
          false,
          "descriptor-commitment",
          "evidence commitment does not match the descriptor's commitment",
          claimed,
        );
      }
      return v(
        e.kind,
        e.ref,
        true,
        "descriptor-commitment",
        "descriptor self-verifies and commitment matches",
        claimed,
      );
    }

    case "omega":
      return v(
        e.kind,
        e.ref,
        false,
        "omega-law",
        "omega proof verification deferred (P0.3 v0): requires frozen law-hash check",
      );

    default:
      return v(
        e.kind,
        e.ref,
        false,
        "unknown",
        `unknown evidence kind '${e.kind}'`,
      );
  }
}
