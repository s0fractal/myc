#!/usr/bin/env -S deno run --allow-read
// myc/src/x8F00_organism.ts — the membrane view: four substrates as ONE body,
// with SPORE.v0 as the mutation unit that circulates through them.
// position: 8/F → projection(8) × frontier(F) = whole-organism self-portrait
// placement_policy: projection
//
// myc is the mycelium AND the membrane: the single surface through which models
// and humans see the body's proofs, graphs, and fractals. This organ renders the
// four substrates as one proof-carrying organism, each giving a DIFFERENT KIND of
// proof (trust is a spectrum), names the FOUR ROOTS where every fractal zoom of
// provenance bottoms out, and shows SPORE.v0 — the content-addressed, fuel-metered
// MUTATION unit — as the spore that circulates and germinates across boundaries.
//
// Boundary note (contracts/SPORE_VS_OMEGA_SPORE_BOUNDARY.v0.1): capital-SPORE is
// the Trinity-OWNED deterministic-apply PROTOCOL (backend-agnostic: wasmtime /
// deno / omega-zk). It is NOT omega's lowercase `spore` (bare-metal mesh-witness
// frames). omega's OWN proof is physics conformance (Genesis 0x549A6307, law
// 0x30A95260, ZK-notarized mitosis), not a SPORE receipt.
//
// A GENERATION, not a doc: a bridge that reads germinated receipts live and points
// at the live topology (`coord --lattice`) / court (`t court --live`), never a
// reimplementation.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);

// The four organs of the body. Each PROVES a different kind of thing.
const ORGANS = [
  {
    substrate: "omega",
    organ: "LAW",
    proves: "a computation OBEYS the frozen physics",
    proof_kind: "Genesis 0x549A6307 · law 0x30A95260 · ZK-notarized mitosis",
    root: "Genesis 0x549A6307 (FNV-1a over frozen anchors, Bitcoin-inscribed)",
  },
  {
    substrate: "liquid",
    organ: "FIELD",
    proves: "a state is STABLE",
    proof_kind: "phase receipt · Kuramoto resonance · PN-CAD ledger",
    root: "phase law / covenant XOR'd into the LUT",
  },
  {
    substrate: "trinity",
    organ: "MIND",
    proves: "a decision is AGREED",
    proof_kind: "voice signature · court quorum · neuron-graph",
    root: "per-voice ed25519 key registry (x2F37)",
  },
  {
    substrate: "myc",
    organ: "MYCELIUM + MEMBRANE",
    proves: "a thing EXISTS with a history",
    proof_kind: "content commitment sha256(fqdn+body) · git intent",
    root: "content hash + the git superproject's history",
  },
] as const;

// SPORE.v0 — the mutation unit. Trinity-owned PROTOCOL, not a substrate: a
// content-addressed, fuel-metered, BLAKE3-committed `apply(mutator, args) →
// output + receipt`, reproducible byte-for-byte across backends. This is "propose
// a change/mutation" made precise; the spore the mycelium spreads. Receipts
// germinate INTO myc (the membrane publishes them; it does not execute them).
const MUTATION = {
  protocol: "SPORE.v0",
  owner: "trinity (contracts/SPORE.v0.draft.md)",
  is: "apply(mutator_hash, input_hashes…) → output_hash + fuel-metered receipt",
  proof_kind: "deterministic apply · spore.fuel.v1 · BLAKE3 spore_id",
  backends: ["wasmtime", "deno", "omega-zk (future)", "liquid-bridge (sim)"],
  germinated_dirs: {
    "SPORE.v0 apply": "substrates/spore/receipts",
    "liquid phase": "substrates/liquid/receipts",
  },
} as const;

async function countReceipts(relDir: string): Promise<string[]> {
  const dir = join(MYC_ROOT, relDir);
  const out: string[] = [];
  try {
    for await (const e of Deno.readDir(dir)) {
      if (e.isFile && e.name.endsWith(".myc.md")) out.push(e.name);
    }
  } catch {
    // dir absent — nothing has germinated here yet
  }
  return out.sort();
}

export async function organism(): Promise<Record<string, unknown>> {
  const germinated: Record<string, string[]> = {};
  let totalGerminated = 0;
  for (const [label, dir] of Object.entries(MUTATION.germinated_dirs)) {
    const files = await countReceipts(dir);
    germinated[label] = files;
    totalGerminated += files.length;
  }

  return {
    type: "organism",
    position: "8/F",
    note:
      "the four substrates as one proof-carrying body; myc is the membrane through which it is seen",
    organs: ORGANS.map((o) => ({ ...o })),
    mutation: {
      ...MUTATION,
      note:
        "every proposal is a spore: content-addressed genome, provenance lineage, germinates only where a backend's proof allows — unverified spores stay dormant + visible, never deleted",
      germinated_into_myc: germinated,
      germinated_total: totalGerminated,
    },
    four_roots: ORGANS.map((o) => ({ substrate: o.substrate, root: o.root })),
    fractal:
      "every provenance zoom bottoms out in these four roots; walk any node with `t myc coord <xNNNN> --why`",
    live_views: {
      membrane_topology: "t myc coord --lattice",
      cross_substrate_court: "t court --live",
    },
  };
}

function renderHuman(o: Record<string, unknown>): void {
  const organs = o.organs as Array<Record<string, unknown>>;
  console.log("🍄 organism — four substrates, one proof-carrying body");
  console.log("   (myc is the membrane through which it is seen)\n");
  for (const g of organs) {
    console.log(`   ${String(g.substrate).padEnd(8)} ${g.organ}`);
    console.log(`            proves ${g.proves}`);
    console.log(`            via ${g.proof_kind}`);
  }
  const m = o.mutation as Record<string, unknown>;
  const germ = m.germinated_total as number;
  console.log(`\n   ⟿ SPORE.v0 — the mutation unit (${m.is})`);
  console.log(
    `     backends: ${(m.backends as string[]).join(", ")}`,
  );
  console.log(`     ${germ} spores germinated into the membrane so far`);
  console.log("\n   four roots (where every fractal zoom of provenance ends):");
  for (const r of o.four_roots as Array<Record<string, string>>) {
    console.log(`     • ${r.substrate.padEnd(8)} ${r.root}`);
  }
  const lv = o.live_views as Record<string, string>;
  console.log(
    `\n   live: ${lv.membrane_topology}  ·  ${lv.cross_substrate_court}`,
  );
}

if (import.meta.main) {
  const o = await organism();
  if (Deno.stdout.isTerminal()) {
    renderHuman(o);
  } else {
    console.log(JSON.stringify(o, null, 2));
  }
}
