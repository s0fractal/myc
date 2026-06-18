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
import { wrap } from "./shared/envelope.ts";

// envelope.ts keeps CborValue local (vendored, parity-locked — not exported).
// Derive the wrap() body type from the function signature instead of importing.
type CborValue = Parameters<typeof wrap>[0];

const HERE = dirname(fromFileUrl(import.meta.url));
// HERE is myc/src/ after migration; MYC_ROOT is the substrate root.
const MYC_ROOT = dirname(HERE);

// myc core components (paths updated post-flat-src migration)
const COMPONENTS = [
  "src/x0100_myc.ts",
  "src/x5F00_import_spore_receipt.ts",
  "ROADMAP.md",
];

async function checkFile(root: string, path: string): Promise<boolean> {
  try {
    await Deno.stat(join(root, path));
    return true;
  } catch {
    return false;
  }
}

export async function statusReceipt(
  root: string,
  opts: { envelope?: boolean } = {},
): Promise<Record<string, unknown>> {
  let ok = 0;
  for (const c of COMPONENTS) {
    if (await checkFile(root, c)) ok++;
  }

  const overall = ok === COMPONENTS.length ? "healthy" : "degraded";

  const substrate_health = {
    type: "SubstrateHealth",
    schema: "trinity.substrate-health.v0.1",
    substrate: "myc",
    overall,
    // myc is the PUBLICATION layer — above omega's physical law, it does not
    // compute it — so it abstains on law_hash (null). The court reads null as
    // abstention, not drift.
    law_hash: null,
    own_components: {
      ok,
      fail: COMPONENTS.length - ok,
      total: COMPONENTS.length,
    },
  };

  const receipt: Record<string, unknown> = {
    type: "status",
    position: "2/E",
    action: "status",
    substrate: "myc",
    note: "MYC operational status",
    law_hash: null,
    summary: {
      overall,
      health: {
        overall,
        ok,
        fail: COMPONENTS.length - ok,
        total: COMPONENTS.length,
      },
    },
    substrate_health,
  };

  // --envelope: myc signs its OWN substrate_health as a ReceiptEnvelope
  // (substrate_tag: myc) — the fourth Substrate Court witness, completing the
  // ecosystem. law_hash abstained (null). See RECEIPT_ENVELOPE.v1.0.
  if (opts.envelope) {
    receipt.substrate_health_envelope = await wrap(
      substrate_health as unknown as CborValue,
      "substrate_health",
      "myc",
      { created_at_logical: {} },
    );
  }

  return receipt;
}

if (import.meta.main) {
  const receipt = await statusReceipt(MYC_ROOT, {
    envelope: Deno.args.includes("--envelope"),
  });
  console.log(JSON.stringify(receipt, null, 2));
}
