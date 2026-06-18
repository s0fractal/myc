#!/usr/bin/env -S deno run --allow-read
// myc/src/x3700_trust.ts — resonance projection (myc ROADMAP Phase 9, hardened).
// position: 3/7 → witness(3) × completion(7) = subjective web-of-trust over the
//                 membrane's published mutations
// placement_policy: projection
//
// The SEE-trust half of the living membrane (architect plan x7300_954205, T2),
// hardened per codex's coarchitect review x3300_954205 (T2.1: integrity-bound).
//
// Honest contract — RESONANCE PROJECTION, not yet a trust oracle:
//   - INTEGRITY is verified: every descriptor's own commitment must equal
//     sha256(stableStringify(body)) (covers: "descriptor.body") or it is exposed
//     as invalid and excluded from scoring.
//   - witnesses AND reviews join by COMMITMENT-IDENTITY, never by fqdn alone: a
//     witness/review counts only if its target_commitment equals the published
//     commitment. A publish with no commitment is an anchorless node — its
//     witnesses can never count.
//   - actors/reviewers are identity-DEDUPED; one actor counts once.
//   - AUTHENTICITY is NOT yet verified — there are no signatures until key
//     custody exists ([[project_consensus_root_sovereignty]]). This view proves
//     "the body matches its commitment and the witness bound to that exact
//     commitment", not "who". It is observability over integrity-verified claims.
//   - honesty invariant: nothing is dropped silently. Invalid descriptors and
//     invalid witnesses are SHOWN; unwitnessed nodes are DORMANT, kept visible.
//   - resonance DESCRIBES the local graph; it is not a target to maximize
//     ([[project_coherence_decreases_with_growth]]).

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { verifyCommitment } from "./x2F50_voice_auth.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);
const DEFAULT_PUBLIC_DIR = join(MYC_ROOT, "public");

/** Extract a frontmatter content_sig block ({voice, sig}) if present. */
function extractContentSig(
  text: string,
): { voice: string; sig: string } | null {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const block = fm[1].match(/content_sig:\n((?: {2}.*\n?)+)/);
  if (!block) return null;
  const voice = block[1].match(/voice:\s*(\S+)/)?.[1];
  const sig = block[1].match(/sig:\s*"([^"]+)"/)?.[1];
  return voice && sig ? { voice, sig } : null;
}

// Canonical commitment, replicated from x0100_myc.ts (stableStringify + sha256Hex)
// to avoid a circular import (x0100 imports this organ for capability-separated
// dispatch). Parity with x0100 is the contract: same body → same commitment.
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function stableStringify(value: Json): string {
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

async function sha256Hex(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Descriptor {
  type?: string;
  fqdn?: string;
  commitment?: { value?: string; covers?: string };
  body?: Record<string, unknown>;
}

/** A descriptor self-verifies iff its commitment.value equals the canonical
 *  commitment over its body. Integrity (body bound to commitment), not identity. */
async function selfVerified(d: Descriptor): Promise<boolean> {
  const claimed = d.commitment?.value;
  if (!claimed || d.body === undefined) return false;
  const recomputed = await sha256Hex(stableStringify(d.body as Json));
  return recomputed === claimed;
}

function extractDescriptor(text: string): Descriptor | null {
  const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as Descriptor;
  } catch {
    return null;
  }
}

async function* walkMd(dir: string): AsyncGenerator<string> {
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory) yield* walkMd(p);
    else if (e.isFile && e.name.endsWith(".myc.md")) yield p;
  }
}

export interface TrustNode {
  target_fqdn: string;
  commitment: string | null;
  derived_from: string | null;
  self_verified: boolean;
  valid_witnesses: string[];
  authenticated_witnesses: string[];
  invalid_witnesses: { actor: string; reason: string }[];
  reviews: { reviewer: string; rating: string }[];
  resonance: number;
  state: "resonant" | "witnessed" | "dormant" | "invalid";
}

export async function trustTopology(
  publicDir: string = DEFAULT_PUBLIC_DIR,
): Promise<Record<string, unknown>> {
  const publishes: Descriptor[] = [];
  const witnesses: {
    d: Descriptor;
    sig: { voice: string; sig: string } | null;
  }[] = [];
  const reviews: Descriptor[] = [];
  const invalid: { type: string; fqdn: string; reason: string }[] = [];

  for await (const path of walkMd(publicDir)) {
    const text = await Deno.readTextFile(path);
    const d = extractDescriptor(text);
    if (!d?.type) continue;
    const kind = d.type;
    if (
      kind !== "PublishDescriptor" && kind !== "WitnessDescriptor" &&
      kind !== "ReviewDescriptor"
    ) continue;
    if (!(await selfVerified(d))) {
      invalid.push({
        type: kind,
        fqdn: d.fqdn ?? "?",
        reason: "commitment does not bind body (self-verify failed)",
      });
      continue; // an unverified descriptor never feeds scoring
    }
    if (kind === "PublishDescriptor") publishes.push(d);
    else if (kind === "WitnessDescriptor") {
      witnesses.push({ d, sig: extractContentSig(text) });
    } else reviews.push(d);
  }

  // superproject root for registry lookup (myc's parent), derived from publicDir
  // when it is the real layout, else default.
  const superproject = dirname(dirname(publicDir));

  const nodes: TrustNode[] = await Promise.all(publishes.map(async (p) => {
    const pubFqdn = p.fqdn ?? "?";
    const pubCommit = p.commitment?.value ?? null;
    const derivedFrom = typeof (p.body ?? {}).derived_from === "string"
      ? (p.body as Record<string, string>).derived_from
      : null;

    const valid = new Set<string>();
    const authenticated = new Set<string>();
    const invalidW: { actor: string; reason: string }[] = [];
    for (const w of witnesses) {
      const b = w.d.body ?? {};
      if (b.target_fqdn !== pubFqdn) continue;
      const actor = String(b.witness_actor ?? "unknown");
      const status = String(b.verification_status ?? "unknown");
      if (!pubCommit) {
        invalidW.push({
          actor,
          reason: "published node has no anchor commitment",
        });
      } else if (b.target_commitment !== pubCommit) {
        invalidW.push({
          actor,
          reason: "commitment mismatch (joined by name only)",
        });
      } else if (status !== "structurally_valid") {
        invalidW.push({ actor, reason: `status: ${status}` });
      } else {
        valid.add(actor); // dedup by actor identity (integrity)
        // authenticity: if the witness carries a content_sig over its own
        // commitment that verifies against the registry, the actor is who it
        // claims. (null = registry unavailable ⇒ honestly not authenticated.)
        if (w.sig && w.d.commitment?.value) {
          const ok = await verifyCommitment(
            w.sig.voice,
            w.d.commitment.value,
            w.sig.sig,
            superproject,
          );
          if (ok) authenticated.add(actor);
        }
      }
    }

    // Reviews join by COMMITMENT identity, deduped per reviewer (latest rating).
    const reviewByReviewer = new Map<string, string>();
    for (const r of reviews) {
      const b = r.body ?? {};
      if (b.target_fqdn !== pubFqdn) continue;
      if (!pubCommit || b.target_commitment !== pubCommit) continue;
      reviewByReviewer.set(
        String(b.reviewer ?? "unknown"),
        String(b.rating ?? "neutral"),
      );
    }
    const rev = [...reviewByReviewer.entries()].map(([reviewer, rating]) => ({
      reviewer,
      rating,
    }));

    const approvals = rev.filter((r) => r.rating === "approve").length;
    const rejections = rev.filter((r) => r.rating === "reject").length;
    const resonance = valid.size + approvals - rejections;

    const state: TrustNode["state"] = !pubCommit
      ? "invalid"
      : resonance > 0
      ? "resonant"
      : valid.size > 0
      ? "witnessed"
      : "dormant";

    return {
      target_fqdn: pubFqdn,
      commitment: pubCommit,
      derived_from: derivedFrom,
      self_verified: true, // only self-verified publishes reach here
      valid_witnesses: [...valid].sort(),
      authenticated_witnesses: [...authenticated].sort(),
      invalid_witnesses: invalidW,
      reviews: rev,
      resonance,
      state,
    };
  }));

  nodes.sort((a, b) => b.resonance - a.resonance);

  const totalAuth = nodes.reduce(
    (n, x) => n + x.authenticated_witnesses.length,
    0,
  );

  return {
    type: "resonance_projection",
    position: "3/7",
    note:
      "integrity + authenticity over published mutations (myc Phase 9). Each descriptor binds its body; witnesses/reviews join by commitment identity; a witness is AUTHENTICATED when its content_sig over its commitment verifies against the voice registry. Resonance describes the graph; it is not a target.",
    counts: {
      published: publishes.length,
      witnesses: witnesses.length,
      reviews: reviews.length,
      dormant: nodes.filter((n) => n.state === "dormant").length,
      invalid_descriptors: invalid.length,
      authenticated_witnesses: totalAuth,
    },
    invalid_descriptors: invalid,
    nodes,
  };
}

function renderHuman(o: Record<string, unknown>): void {
  const c = o.counts as Record<string, number>;
  console.log("🤝 resonance projection — integrity + authenticity");
  console.log(
    `   ${c.published} published · ${c.witnesses} witnesses (${c.authenticated_witnesses} authenticated) · ${c.reviews} reviews · ${c.dormant} dormant · ${c.invalid_descriptors} invalid\n`,
  );
  for (const iv of o.invalid_descriptors as Array<Record<string, string>>) {
    console.log(`   ✗ invalid ${iv.type} ${iv.fqdn}: ${iv.reason}`);
  }
  const nodes = o.nodes as TrustNode[];
  if (nodes.length === 0) {
    console.log("   (no integrity-valid published mutations yet)");
    return;
  }
  for (const n of nodes) {
    const icon = n.state === "resonant"
      ? "✓"
      : n.state === "witnessed"
      ? "·"
      : n.state === "invalid"
      ? "✗"
      : "○";
    const auth = new Set(n.authenticated_witnesses);
    const who = n.valid_witnesses
      .map((a) => auth.has(a) ? `${a}🔏` : a)
      .join(", ") || "—";
    console.log(`   ${icon} r=${n.resonance}  ${n.target_fqdn}  (${n.state})`);
    console.log(`        witnessed by: ${who}   (🔏 = authenticated)`);
    for (const iv of n.invalid_witnesses) {
      console.log(`        ⚠ ${iv.actor}: ${iv.reason}`);
    }
    for (const r of n.reviews) {
      console.log(`        review ${r.reviewer}: ${r.rating}`);
    }
  }
  console.log(
    "\n   ○ dormant = published, integrity-valid, not yet witnessed.",
  );
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const o = await trustTopology();
  if (!args.includes("--json") && Deno.stdout.isTerminal()) renderHuman(o);
  else console.log(JSON.stringify(o, null, 2));
}

if (import.meta.main) await runCli();
