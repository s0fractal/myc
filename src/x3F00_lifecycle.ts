#!/usr/bin/env -S deno run --allow-read
// myc/src/x3F00_lifecycle.ts — the canonical mutation lifecycle (architect plan
// x7300_954205 T3; sequenced after T2.1 per codex review x3300_954205).
// position: 3/F → witness(3) × frontier(F) = one vocabulary for a mutation's life
// placement_policy: projection
//
// Codex asked for the canonical lifecycle state machine: "its value is not the
// number of current nodes; it is one vocabulary for proposed → witnessed →
// reviewed → germinated/dormant." This is that single source of truth.
//
// It unifies two worlds the membrane keeps separately:
//   - APPLY RECEIPTS (substrates/*/receipts/): a SPORE.v0 apply or a liquid phase
//     receipt — the mutation was computed and receipted. State: `applied`.
//   - the CONSENSUS GRAPH (public/consensus/): publish/witness/review — the
//     mutation entered the membrane and accrues trust. States from x3700 (T2.1):
//     resonant / witnessed / dormant / invalid.
//
// HONESTY: the cross-world LINK (which applied receipt became which published
// node) is NOT yet expressed in the data — apply receipts carry spore_id/
// intent_hash; publish descriptors carry target_fqdn/target_commitment, with no
// shared key. So this view classifies BOTH worlds into one vocabulary but does
// not claim an end-to-end thread it cannot prove. Threading them is the next DATA
// step (a descriptor field), not a view trick. Read-only; a bridge, not authority.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { trustTopology } from "./x3700_trust.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);

// The canonical lifecycle. Ordered; `dormant`/`invalid` are off-path states.
export const LIFECYCLE = [
  {
    state: "applied",
    of: "apply-receipt",
    meaning:
      "computed + receipted (SPORE apply or phase); not yet on the consensus surface",
  },
  {
    state: "published",
    of: "consensus",
    meaning: "entered the membrane as a PublishDescriptor",
  },
  {
    state: "witnessed",
    of: "consensus",
    meaning: "≥1 commitment-bound witness verified it",
  },
  {
    state: "reviewed",
    of: "consensus",
    meaning: "≥1 commitment-bound review rated it",
  },
  {
    state: "resonant",
    of: "consensus",
    meaning: "trust-positive (germinated): witnessed and/or net-approved",
  },
  {
    state: "dormant",
    of: "consensus",
    meaning: "published, integrity-valid, unwitnessed — visible, never hidden",
  },
  {
    state: "invalid",
    of: "consensus",
    meaning: "integrity failure — commitment does not bind body",
  },
] as const;

interface Mutation {
  id: string;
  kind: "spore-apply" | "phase" | "consensus";
  state: string;
  detail: string;
}

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*"?([^"\n]*?)"?\s*$/i);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

async function readReceipts(
  relDir: string,
  kind: "spore-apply" | "phase",
): Promise<Mutation[]> {
  const dir = join(MYC_ROOT, relDir);
  const out: Mutation[] = [];
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".myc.md")) continue;
    const fm = frontmatter(await Deno.readTextFile(join(dir, e.name)));
    const id = fm.spore_id ?? fm.intent_hash ?? e.name;
    const detail = kind === "spore-apply"
      ? `status=${fm.status ?? "?"} fuel=${fm.total_fuel ?? "?"} (${
        fm.fuel_model ?? "spore.fuel.v1"
      })`
      : `status=${fm.status ?? "?"} phase=${fm.derived_phase ?? "?"}`;
    out.push({ id: id.slice(0, 16), kind, state: "applied", detail });
  }
  return out;
}

export async function lifecycle(): Promise<Record<string, unknown>> {
  const applied = [
    ...await readReceipts("substrates/spore/receipts", "spore-apply"),
    ...await readReceipts("substrates/liquid/receipts", "phase"),
  ];

  const trust = await trustTopology();
  const nodes = (trust.nodes ?? []) as Array<Record<string, unknown>>;
  const consensus: Mutation[] = nodes.map((n) => ({
    id: String(n.target_fqdn).slice(0, 24),
    kind: "consensus",
    state: String(n.state),
    detail: `resonance=${n.resonance} witnesses=[${
      (n.valid_witnesses as string[]).join(",")
    }]`,
  }));

  const mutations = [...applied, ...consensus];
  const counts: Record<string, number> = {};
  for (const m of mutations) counts[m.state] = (counts[m.state] ?? 0) + 1;

  return {
    type: "lifecycle",
    position: "3/F",
    note:
      "one vocabulary for a mutation's life (T3). Classifies apply-receipts (applied) and the consensus graph (published→resonant/dormant/invalid). The apply→published LINK is not yet in the data — that is the next data step, not a view claim.",
    vocabulary: LIFECYCLE,
    counts,
    mutations,
  };
}

function renderHuman(o: Record<string, unknown>): void {
  console.log("🌱 mutation lifecycle — one vocabulary across the membrane\n");
  console.log(
    "   states: applied → published → witnessed → reviewed → resonant",
  );
  console.log(
    "           (off-path: dormant = unwitnessed · invalid = unbound)\n",
  );
  const counts = o.counts as Record<string, number>;
  console.log(
    "   " +
      Object.entries(counts).map(([s, n]) => `${s}:${n}`).join("  ") + "\n",
  );
  for (const m of o.mutations as Mutation[]) {
    const icon = m.kind === "consensus" ? "◆" : "⟿";
    console.log(
      `   ${icon} ${m.state.padEnd(10)} ${m.id.padEnd(26)} ${m.detail}`,
    );
  }
  console.log(
    "\n   ⟿ apply-receipt (SPORE/phase)   ◆ consensus node",
  );
  console.log(
    "   note: apply→published is not yet threaded in the data (next data step).",
  );
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const o = await lifecycle();
  if (!args.includes("--json") && Deno.stdout.isTerminal()) renderHuman(o);
  else console.log(JSON.stringify(o, null, 2));
}

if (import.meta.main) await runCli();
