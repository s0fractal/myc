#!/usr/bin/env -S deno run --allow-read
// myc/src/x8F00_organism.ts — the membrane view: four substrates as ONE body.
// position: 8/F → projection(8) × frontier(F) = whole-organism self-portrait
// placement_policy: projection
//
// myc is the mycelium AND the membrane: the single surface through which models
// and humans see the body's proofs, graphs, and fractals. This organ renders the
// four substrates as one proof-carrying organism, names the FOUR ROOTS where
// every fractal zoom of provenance bottoms out, and counts the spores that have
// already germinated across substrate boundaries (receipts that flowed INTO myc).
//
// It is a GENERATION, not a doc: a bridge over the existing substrates (it reads
// the germinated receipts live and points at the live topology), never a parallel
// reimplementation. Live membrane topology stays `t myc coord --lattice`; the
// court stays `t court --live`; this is the body's self-portrait that frames both.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);

// The four organs of the body. Each gives a DIFFERENT KIND of proof — trust is a
// spectrum, and the membrane makes every kind legible in one graph.
const ORGANS = [
  {
    substrate: "omega",
    organ: "LAW",
    proves: "a computation is TRUE",
    proof_kind: "SPORE-apply receipt · Bitcoin-anchored",
    root: "Bitcoin Genesis 0x549A6307 (inscribed)",
    germinated_dir: "substrates/spore/receipts",
  },
  {
    substrate: "liquid",
    organ: "FIELD",
    proves: "a state is STABLE",
    proof_kind: "phase receipt · Kuramoto resonance",
    root: "phase law / covenant XOR'd into the LUT",
    germinated_dir: "substrates/liquid/receipts",
  },
  {
    substrate: "trinity",
    organ: "MIND",
    proves: "a decision is AGREED",
    proof_kind: "voice signature · court quorum",
    root: "per-voice ed25519 key registry (x2F37)",
    germinated_dir: null, // trinity's utterances live as chords in the lattice
  },
  {
    substrate: "myc",
    organ: "MYCELIUM + MEMBRANE",
    proves: "a thing EXISTS with a history",
    proof_kind: "content commitment sha256(fqdn+body) · git intent",
    root: "content hash + the git superproject's history",
    germinated_dir: null, // myc IS the membrane; the others germinate into it
  },
] as const;

async function countReceipts(relDir: string): Promise<string[]> {
  const dir = join(MYC_ROOT, relDir);
  const out: string[] = [];
  try {
    for await (const e of Deno.readDir(dir)) {
      if (e.isFile && e.name.endsWith(".myc.md")) out.push(e.name);
    }
  } catch {
    // dir absent — no spores have germinated here yet
  }
  return out.sort();
}

export async function organism(): Promise<Record<string, unknown>> {
  const organs = await Promise.all(ORGANS.map(async (o) => {
    const germinated = o.germinated_dir
      ? await countReceipts(o.germinated_dir)
      : [];
    return {
      substrate: o.substrate,
      organ: o.organ,
      proves: o.proves,
      proof_kind: o.proof_kind,
      root: o.root,
      germinated_into_myc: germinated,
      germinated_count: germinated.length,
    };
  }));

  const totalGerminated = organs.reduce((n, o) => n + o.germinated_count, 0);

  return {
    type: "organism",
    position: "8/F",
    note:
      "the four substrates as one proof-carrying body; myc is the membrane through which it is seen",
    organs,
    spores: {
      note:
        "every proposal is a spore: content-addressed genome, provenance lineage, germinates only where its substrate's proof allows — unverified spores stay dormant + visible, never deleted",
      germinated_across_substrates: totalGerminated,
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
    const germ = g.germinated_count as number;
    const tag = germ > 0 ? `  ⟿ ${germ} germinated into myc` : "";
    console.log(`   ${String(g.substrate).padEnd(8)} ${g.organ}`);
    console.log(
      `            proves ${g.proves} — ${g.proof_kind}${tag}`,
    );
  }
  console.log("\n   four roots (where every fractal zoom of provenance ends):");
  for (const r of o.four_roots as Array<Record<string, string>>) {
    console.log(`     • ${r.substrate.padEnd(8)} ${r.root}`);
  }
  const lv = o.live_views as Record<string, string>;
  console.log("\n   every proposal is a spore: germinates only where its");
  console.log(
    "   substrate's proof allows; unverified stays dormant + visible.",
  );
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
