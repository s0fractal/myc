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

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";

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
      // a canonical git object id is 40 hex; the commitment must equal it. We do
      // NOT prove existence here (that needs git; out of a read-only projection) —
      // so this establishes a CANONICAL POINTER, never a backend proof on its own.
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
        true,
        "git-object-id",
        "canonical git id; existence not verified from read-only projection",
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
      const payload = frontmatterField(text, "payload"); // content_sig payload
      if (!payload) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "chord has no content_sig payload to bind",
        );
      }
      if (norm(payload) !== norm(e.commitment)) {
        return v(
          e.kind,
          e.ref,
          false,
          "chord-content-sig",
          "commitment does not match the chord's content identity",
          norm(payload),
        );
      }
      return v(
        e.kind,
        e.ref,
        true,
        "chord-content-sig",
        "chord resolved; commitment matches its content identity",
        norm(payload),
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
      const id = frontmatterField(text, "spore_id") ??
        frontmatterField(text, "intent_hash");
      if (!id) {
        return v(
          e.kind,
          e.ref,
          false,
          `${sub}-receipt`,
          "receipt carries no spore_id/intent_hash to bind",
        );
      }
      if (norm(id) !== norm(e.commitment)) {
        return v(
          e.kind,
          e.ref,
          false,
          `${sub}-receipt`,
          "commitment does not match the receipt identity",
          norm(id),
        );
      }
      return v(
        e.kind,
        e.ref,
        true,
        `${sub}-receipt`,
        `${sub} receipt resolved; identity matches`,
        norm(id),
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
