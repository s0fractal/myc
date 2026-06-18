#!/usr/bin/env -S deno run --allow-read
// myc/src/x8FF0_membrane.ts — the single surface. The architect's founding vision:
// "єдина суть, крізь яку моделі та люди взаємодіють з міцелієм, бачачи докази,
// графи, фрактали." This composes the SEE organs into ONE membrane front door.
// position: 8/F → projection(8) × frontier(F) = the whole surface (the body's face)
// placement_policy: projection
//
// Not a new data view — the UNIFICATION. It reads the body (x8F00 organism), its
// trust (x3700, integrity-bound resonance), and its mutations' lives (x3F00
// lifecycle), and renders them as one perceivable surface with depth-pointers, so
// a model or human meets the membrane as a whole, then zooms. Read-only; a bridge.

import { organism } from "./x8F00_organism.ts";
import { trustTopology } from "./x3700_trust.ts";
import { lifecycle } from "./x3F00_lifecycle.ts";

export async function membrane(): Promise<Record<string, unknown>> {
  const [body, trust, life] = await Promise.all([
    organism(),
    trustTopology(),
    lifecycle(),
  ]);
  return {
    type: "membrane",
    position: "8/F",
    note:
      "the single surface: the body (organism), its trust (resonance, integrity-bound), and its mutations' lives (lifecycle), composed. Zoom with the deeper commands.",
    body,
    trust,
    lifecycle: life,
    deeper: {
      "the body": "t myc organism",
      "trust topology": "t myc trust",
      "mutation lifecycle": "t myc lifecycle",
      "capability boundary": "t myc effects",
      "live graph topology": "t myc coord --lattice",
      "any node's provenance": "t myc coord <xNNNN> --why",
    },
  };
}

function renderHuman(o: Record<string, unknown>): void {
  const body = o.body as Record<string, unknown>;
  const trust = o.trust as Record<string, unknown>;
  const life = o.lifecycle as Record<string, unknown>;
  const organs = body.organs as Array<Record<string, unknown>>;
  const tc = trust.counts as Record<string, number>;
  const lc = life.counts as Record<string, number>;

  console.log(
    "╭─ myc — the membrane ─────────────────────────────────────────╮",
  );
  console.log(
    "│  one surface onto the four-substrate body and its mutations  │",
  );
  console.log(
    "╰──────────────────────────────────────────────────────────────╯\n",
  );

  console.log("  the body (proves):");
  for (const g of organs) {
    console.log(
      `    ${String(g.substrate).padEnd(8)} ${g.organ}  — ${g.proves}`,
    );
  }
  const m = body.mutation as Record<string, unknown>;
  console.log(
    `    ⟿ SPORE.v0  the mutation unit (${m.germinated_total} germinated)\n`,
  );

  console.log("  trust (integrity-verified, not yet authenticated):");
  console.log(
    `    ${tc.published} published · ${tc.witnesses} witnesses · ${tc.dormant} dormant · ${tc.invalid_descriptors} invalid`,
  );
  console.log("\n  mutation lifecycle:");
  console.log(
    "    " + Object.entries(lc).map(([s, n]) => `${s}:${n}`).join("  "),
  );

  console.log("\n  four roots (where every fractal zoom ends):");
  for (const r of body.four_roots as Array<Record<string, string>>) {
    console.log(`    • ${r.substrate.padEnd(8)} ${r.root}`);
  }

  console.log("\n  zoom deeper:");
  for (
    const [label, cmd] of Object.entries(o.deeper as Record<string, string>)
  ) {
    console.log(`    ${cmd.padEnd(34)} ${label}`);
  }
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const o = await membrane();
  if (!args.includes("--json") && Deno.stdout.isTerminal()) renderHuman(o);
  else console.log(JSON.stringify(o, null, 2));
}

if (import.meta.main) await runCli();
