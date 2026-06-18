#!/usr/bin/env -S deno run --allow-read
// myc/src/x3700_trust.ts — trust topology / resonance ranking (myc ROADMAP Phase 9).
// position: 3/7 → witness(3) × completion(7) = subjective web-of-trust over the
//                 membrane's published mutations
// placement_policy: projection
//
// The SEE-trust half of the living membrane (architect plan x7300_954205, T2).
// Reads the consensus graph myc already writes — PublishDescriptor (a thing was
// published), WitnessDescriptor (an actor verified it), ReviewDescriptor (an actor
// rated it) — and surfaces a SUBJECTIVE resonance signal per published node.
//
// Honesty invariants (the membrane never hides where trust is missing):
//   - a witness only COUNTS if its target_commitment actually matches the
//     published commitment; a mismatched witness is SHOWN as invalid, not dropped.
//   - a published node with no valid witness is DORMANT, shown explicitly — not
//     deleted, not hidden.
//   - resonance is a DESCRIPTOR of the local witness graph, NOT a fitness target
//     to maximize ([[project_coherence_decreases_with_growth]]); ranking orders
//     for legibility, it does not reward accumulation.
//
// A bridge, not a reimplementation: it reads what publish/witness/review write;
// it computes no new authority. Reached via `t myc trust`.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);
const PUBLIC_DIR = join(MYC_ROOT, "public");

interface Descriptor {
  type?: string;
  fqdn?: string;
  commitment?: { value?: string };
  body?: Record<string, unknown>;
}

/** Extract the ```json myc fenced descriptor body from a .myc.md file. */
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
    if (e.isDirectory) {
      yield* walkMd(p);
    } else if (e.isFile && e.name.endsWith(".myc.md")) {
      yield p;
    }
  }
}

export interface TrustNode {
  target_fqdn: string;
  commitment: string | null;
  valid_witnesses: { actor: string; status: string }[];
  invalid_witnesses: { actor: string; reason: string }[];
  reviews: { reviewer: string; rating: string }[];
  resonance: number;
  state: "resonant" | "witnessed" | "dormant";
}

export async function trustTopology(): Promise<Record<string, unknown>> {
  const publishes: Descriptor[] = [];
  const witnesses: Descriptor[] = [];
  const reviews: Descriptor[] = [];

  for await (const path of walkMd(PUBLIC_DIR)) {
    const d = extractDescriptor(await Deno.readTextFile(path));
    if (!d?.type) continue;
    if (d.type === "PublishDescriptor") publishes.push(d);
    else if (d.type === "WitnessDescriptor") witnesses.push(d);
    else if (d.type === "ReviewDescriptor") reviews.push(d);
  }

  const nodes: TrustNode[] = publishes.map((p) => {
    const pubFqdn = p.fqdn ?? "?";
    const pubCommit = p.commitment?.value ?? null;

    const valid: { actor: string; status: string }[] = [];
    const invalid: { actor: string; reason: string }[] = [];
    for (const w of witnesses) {
      const b = w.body ?? {};
      if (b.target_fqdn !== pubFqdn) continue;
      const actor = String(b.witness_actor ?? "unknown");
      const status = String(b.verification_status ?? "unknown");
      // A witness is only real if it committed to the published commitment AND
      // declared structural validity. Otherwise it is shown, not counted.
      if (pubCommit && b.target_commitment !== pubCommit) {
        invalid.push({ actor, reason: "commitment mismatch" });
      } else if (status !== "structurally_valid") {
        invalid.push({ actor, reason: `status: ${status}` });
      } else {
        valid.push({ actor, status });
      }
    }

    const rev = reviews
      .filter((r) => (r.body ?? {}).target_fqdn === pubFqdn)
      .map((r) => ({
        reviewer: String((r.body ?? {}).reviewer ?? "unknown"),
        rating: String((r.body ?? {}).rating ?? "neutral"),
      }));

    // Resonance v0: distinct valid witnesses + (approvals − rejections). A
    // DESCRIPTOR of local trust, deliberately simple and not a target to game.
    const distinctWitnesses = new Set(valid.map((v) => v.actor)).size;
    const approvals = rev.filter((r) => r.rating === "approve").length;
    const rejections = rev.filter((r) => r.rating === "reject").length;
    const resonance = distinctWitnesses + approvals - rejections;

    const state: TrustNode["state"] = resonance > 0
      ? "resonant"
      : valid.length > 0
      ? "witnessed"
      : "dormant";

    return {
      target_fqdn: pubFqdn,
      commitment: pubCommit,
      valid_witnesses: valid,
      invalid_witnesses: invalid,
      reviews: rev,
      resonance,
      state,
    };
  });

  nodes.sort((a, b) => b.resonance - a.resonance);

  return {
    type: "trust_topology",
    position: "3/7",
    note:
      "subjective resonance over the membrane's published mutations (myc Phase 9). resonance describes the local witness graph; it is not a target to maximize.",
    counts: {
      published: publishes.length,
      witnesses: witnesses.length,
      reviews: reviews.length,
      dormant: nodes.filter((n) => n.state === "dormant").length,
    },
    nodes,
  };
}

function renderHuman(o: Record<string, unknown>): void {
  const c = o.counts as Record<string, number>;
  console.log("🤝 trust topology — resonance over published mutations");
  console.log(
    `   ${c.published} published · ${c.witnesses} witnesses · ${c.reviews} reviews · ${c.dormant} dormant\n`,
  );
  const nodes = o.nodes as TrustNode[];
  if (nodes.length === 0) {
    console.log("   (no published mutations yet — the membrane is quiet)");
    return;
  }
  for (const n of nodes) {
    const icon = n.state === "resonant"
      ? "✓"
      : n.state === "witnessed"
      ? "·"
      : "○";
    const who = n.valid_witnesses.map((w) => w.actor).join(", ") || "—";
    console.log(`   ${icon} r=${n.resonance}  ${n.target_fqdn}`);
    console.log(`        witnessed by: ${who}   (${n.state})`);
    for (const iv of n.invalid_witnesses) {
      console.log(`        ⚠ invalid witness ${iv.actor}: ${iv.reason}`);
    }
    for (const r of n.reviews) {
      console.log(`        review ${r.reviewer}: ${r.rating}`);
    }
  }
  console.log(
    "\n   ○ dormant = published, not yet witnessed — visible, never hidden.",
  );
}

if (import.meta.main) {
  const o = await trustTopology();
  if (Deno.stdout.isTerminal()) {
    renderHuman(o);
  } else {
    console.log(JSON.stringify(o, null, 2));
  }
}
