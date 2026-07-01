// src/verify_core.ts — pure, worker-safe content-commitment verification.
//
// Shared by the CLI (x0100_myc.ts) AND the Cloudflare Worker
// (sites/myc.md/worker.ts) so the LIVE /publish + /resolve paths verify content
// BY HASH — not just the witness's word (audit A2, closing the P0 where the
// membrane served KV-published records as authoritative with no re-verification).
//
// NO Deno / fs / node deps — crypto.subtle + TextEncoder only, so it bundles into
// a Worker. One source of truth: verifyDescriptor delegates here.

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

const TE = new TextEncoder();

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? TE.encode(input) : input;
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function stableStringify(value: Json): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${
    keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")
  }}`;
}

export interface Committed {
  body: Json;
  commitment?: { algorithm?: string; covers?: string; value?: string };
}

/** Canonical body-commitment check: commitment.value == sha256(stableStringify(body)),
 *  algorithm sha256, covers descriptor.body. The pure heart of verifyDescriptor. */
export async function verifyCommitment(
  d: Committed,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const c = d.commitment;
  if (!c) return { ok: false, errors: ["no commitment"] };
  if (c.algorithm !== "sha256") {
    errors.push(`unsupported algorithm: ${c.algorithm}`);
  }
  if (c.covers !== "descriptor.body") {
    errors.push(`unsupported cover: ${c.covers}`);
  }
  const actual = await sha256Hex(stableStringify(d.body));
  if (actual !== c.value) {
    errors.push(`commitment mismatch: expected ${c.value}, got ${actual}`);
  }
  return { ok: errors.length === 0, errors };
}
