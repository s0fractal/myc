#!/usr/bin/env -S deno run --allow-read
// myc/src/x2E00_status.ts — myc native status / self-reflection
// position: 2/E → mirror(2) × harmony-pair(E) = state-aware self-reflection
// hex_dipole: "00 00 6C 40 33 26 4C 33"
// placement_policy: axis
// migrated 2026-05-22 from myc/0x2/E.ts as part of partial flat-src migration

import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
// HERE is myc/src/ after migration; MYC_ROOT is the substrate root.
const MYC_ROOT = dirname(HERE);

async function checkFile(path: string): Promise<boolean> {
  try {
    await Deno.stat(join(MYC_ROOT, path));
    return true;
  } catch {
    return false;
  }
}

if (import.meta.main) {
  // Check myc core components (paths updated post-flat-src migration)
  const components = [
    "src/x0100_myc.ts",
    "src/x5F00_import_spore_receipt.ts",
    "ROADMAP.md",
  ];

  let ok = 0;
  for (const c of components) {
    if (await checkFile(c)) ok++;
  }

  const overall = ok === components.length ? "healthy" : "degraded";

  const receipt = {
    type: "status",
    position: "2/E",
    action: "status",
    substrate: "myc",
    note: "MYC operational status",
    summary: {
      overall,
      health: {
        overall,
        ok,
        fail: components.length - ok,
        total: components.length,
      },
    },
  };

  console.log(JSON.stringify(receipt, null, 2));
}
