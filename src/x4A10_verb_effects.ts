#!/usr/bin/env -S deno run --allow-read
// myc/src/x4A10_verb_effects.ts — the typed effect of every myc CLI verb.
// position: 4/A → foundation(4) × mirror-pair(A) = foundation reflected (capability)
// placement_policy: axis
//
// The single source of truth for capability-separated dispatch (codex coarchitect
// review x3300_954205; receipt x6700_954205). Each verb is typed by the authority
// it needs: `read` (no write, no net), `effect` (writes the descriptor graph /
// stamps provenance on disk), or `serve` (binds the network). trinity's `t myc`
// passthrough MIRRORS this map and is parity-checked against it, so the capability
// boundary is typed and auditable — not a hardcoded social convention.

export type Effect = "read" | "effect" | "serve";

// Verb → minimum authority. Unknown verbs default to `read` (fail-closed).
export const VERB_EFFECTS: Record<string, Effect> = {
  // read surfaces — perceive, never mutate
  resolve: "read",
  coord: "read", // exception: `coord --stamp` writes — see classify()
  organism: "read",
  membrane: "read",
  trust: "read",
  resonance: "read",
  lifecycle: "read",
  verify: "read",
  "verify-graph": "read",
  "verify-projections": "read",
  lineage: "read",
  explain: "read",
  availability: "read",
  "adapter-dry-run": "read",
  "dry-run": "read",
  capabilities: "read",
  status: "read",
  search: "read",
  effects: "read",
  help: "read",
  // effect surfaces — write the descriptor graph / stamp provenance
  propose: "effect",
  capture: "effect",
  publish: "effect",
  witness: "effect",
  review: "effect",
  import: "effect",
  reproject: "effect",
  index: "effect",
  graph: "effect",
  demo: "effect",
  // network
  serve: "serve",
};

/** Classify a verb's effect, accounting for effectful flags (coord --stamp
 *  writes a provenance block on disk). Unknown verbs are `read` (fail-closed). */
export function classify(verb: string, args: string[] = []): Effect {
  if (verb === "coord" && args.includes("--stamp")) return "effect";
  return VERB_EFFECTS[verb] ?? "read";
}

export function runCli(args: string[] = Deno.args): void {
  const rows = Object.entries(VERB_EFFECTS)
    .map(([verb, effect]) => ({ verb, effect }))
    .sort((a, b) =>
      a.effect.localeCompare(b.effect) || a.verb.localeCompare(b.verb)
    );
  const payload = {
    type: "verb_effects",
    position: "4/A",
    note:
      "typed effect of every myc verb; the t myc passthrough mirrors this (parity-checked). read = no write/net; effect = writes; serve = network. unknown verbs fail closed to read.",
    verbs: rows,
  };
  if (!args.includes("--json") && Deno.stdout.isTerminal()) {
    console.log("🔐 myc verb effects — the capability boundary, typed\n");
    for (const r of rows) {
      const icon = r.effect === "read"
        ? "👁 "
        : r.effect === "serve"
        ? "🌐"
        : "✎ ";
      console.log(`   ${icon} ${r.effect.padEnd(7)} ${r.verb}`);
    }
    console.log(
      "\n   read = no write/net · effect = writes · serve = net · unknown → read",
    );
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
}

if (import.meta.main) runCli();
