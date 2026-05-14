#!/usr/bin/env -S deno run --allow-read
// myc/0x2/E.ts — myc native status / self-reflection
// position: 2/E → mirror(2) × harmony-pair(E) = state-aware self-reflection
// hex_dipole: "00 00 6C 40 33 26 4C 33"
// placement_policy: axis

import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
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
  // Check myc core components
  const components = [
    "tools/myc.ts",
    "tools/import_spore_receipt.ts",
    "ROADMAP.md"
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
      }
    }
  };

  console.log(JSON.stringify(receipt, null, 2));
}
