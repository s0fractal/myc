#!/usr/bin/env -S deno run --allow-read --allow-write
// import_snapshot.ts — Resonant Resolution: receive a peer's network export, verify
// it by hash, and merge the NEW verified records into your local network. The
// receive-half of resonant-peer exchange (export → verify → merge).
//
// Trust the hash, not the host:
//   - only records that pass canonical verification (verify_snapshot) are eligible;
//   - existing content is never overwritten (content-addressed);
//   - a same-path record with DIFFERENT bytes is a CONFLICT, reported, never applied;
//   - dry-run by default — nothing is written without --write.
// (chord x6000_954726)
import { dirname, join } from "jsr:@std/path@1.1.4";
import { loadSnapshot, type Snapshot } from "./snapshot.ts";
import { verifySnapshot } from "./verify_snapshot.ts";
import { rebuildIndex } from "../../src/x0100_myc.ts";

export interface ImportPlan {
  verified: number;
  rejected: Array<{ fqdn: string; errors: string[] }>;
  // keyed by PATH — the unique write unit (fqdns may alias across paths)
  new_paths: string[];
  existing_paths: string[];
  conflicts: Array<{ fqdn: string; path: string }>;
}

/** Decide what an import would do, writing nothing. A record is merged only if it
 *  verifies AND is absent locally; identical bytes already present are skipped;
 *  same path with different bytes is a conflict (never silently overwritten).
 *  Classification is by PATH — fqdns can alias, but a file path is unique. */
export async function planImport(
  snapshot: Snapshot,
  localRoot: string,
): Promise<ImportPlan> {
  const v = await verifySnapshot(snapshot);
  const rejected = new Set(v.failed.map((f) => f.fqdn));
  const new_paths: string[] = [];
  const existing_paths: string[] = [];
  const conflicts: Array<{ fqdn: string; path: string }> = [];

  for (const r of snapshot.records ?? []) {
    if (rejected.has(r.fqdn)) continue; // never import what didn't verify
    let localText: string | null = null;
    try {
      localText = await Deno.readTextFile(join(localRoot, r.path));
    } catch {
      localText = null;
    }
    if (localText === null) new_paths.push(r.path);
    else if (localText === r.rawText) existing_paths.push(r.path);
    else conflicts.push({ fqdn: r.fqdn, path: r.path });
  }
  return {
    verified: v.verified,
    rejected: v.failed,
    new_paths,
    existing_paths,
    conflicts,
  };
}

/** Apply a plan: write the new verified records into localRoot and reindex.
 *  Only `new_paths` are written — never existing, never conflicts. Keyed by path. */
export async function applyImport(
  snapshot: Snapshot,
  localRoot: string,
  plan: ImportPlan,
): Promise<number> {
  const toWrite = new Set(plan.new_paths);
  let written = 0;
  for (const r of snapshot.records ?? []) {
    if (!toWrite.has(r.path)) continue;
    const full = join(localRoot, r.path);
    await Deno.mkdir(dirname(full), { recursive: true });
    await Deno.writeTextFile(full, r.rawText);
    written++;
  }
  if (written > 0) await rebuildIndex(localRoot);
  return written;
}

async function main() {
  const source = Deno.args[0];
  const write = Deno.args.includes("--write");
  if (!source || source.startsWith("--")) {
    console.error(
      "usage: import_snapshot.ts <snapshot.json | https://…/snapshot.json> [--write]",
    );
    Deno.exitCode = 2;
    return;
  }
  const root = Deno.env.get("MYC_ROOT") ?? Deno.cwd();
  let snapshot: Snapshot;
  try {
    snapshot = await loadSnapshot(source);
  } catch (e) {
    console.log(JSON.stringify(
      {
        type: "snapshot-import",
        verdict: "UNREADABLE",
        error: (e as Error).message,
      },
      null,
      2,
    ));
    Deno.exitCode = 2;
    return;
  }

  const plan = await planImport(snapshot, root);
  let written = 0;
  if (write) written = await applyImport(snapshot, root, plan);

  console.log(JSON.stringify(
    {
      type: "snapshot-import",
      mode: write ? "applied" : "dry-run",
      verified: plan.verified,
      rejected: plan.rejected.length,
      new: plan.new_paths.length,
      existing: plan.existing_paths.length,
      conflicts: plan.conflicts,
      written,
      new_paths: plan.new_paths,
      note: write
        ? `merged ${written} new verified record(s) into ${root}`
        : "dry-run — re-run with --write to merge the new verified records",
    },
    null,
    2,
  ));
  // conflicts or rejections are not failures of the import itself, but surface them
  if (plan.rejected.length > 0 && plan.verified === 0) Deno.exitCode = 2;
}

if (import.meta.main) await main();
