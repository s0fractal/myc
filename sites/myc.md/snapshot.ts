#!/usr/bin/env -S deno run --allow-read --allow-write
// snapshot.ts — Resonant Resolution: build a portable, content-addressed snapshot of
// the PUBLIC network (index + every published descriptor + its raw source). This is
// the content a tier-2 fallback would serve and resonant peers would exchange — a
// whole local-first network in one verifiable file. Record shape matches the
// resolver's, so a client can browse a snapshot directly. (chord x6000_954726, step 2)
//
// Usage: deno run -A snapshot.ts [--write <path>]   (default: print to stdout)
//        ./t myc snapshot [--write <path>]
import { join } from "jsr:@std/path@1.1.4";

export interface SnapshotRecord {
  fqdn: string;
  path: string;
  type: string;
  commitment: string;
  descriptor: unknown;
  rawText: string;
}

export interface Snapshot {
  schema: "myc.public-snapshot.v0.1";
  record_count: number;
  records: SnapshotRecord[];
}

/** Extract the descriptor JSON block from a .myc.md body (```json … ```). Returns
 *  null when absent/unparseable — rawText stays the source of truth either way. */
export function parseDescriptorBlock(rawText: string): unknown {
  const m = rawText.match(/```json[^\n]*\n([\s\S]*?)\n```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Build a deterministic snapshot from a myc root's public/ index + descriptors.
 *  Pure w.r.t. the tree: same public/ → byte-identical snapshot (records sorted by
 *  fqdn). Missing files are skipped, never invented. */
export async function buildSnapshot(root: string): Promise<Snapshot> {
  const indexText = await Deno.readTextFile(
    join(root, "public", "index.ndjson"),
  );
  const parsed = indexText
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Omit<SnapshotRecord, "descriptor" | "rawText">)
    .sort((a, b) => (a.fqdn < b.fqdn ? -1 : a.fqdn > b.fqdn ? 1 : 0));

  // Dedupe by PATH: a file is one content. The index may carry several fqdn aliases
  // for one file (e.g. naming proofs); the snapshot carries each file once (rebuild
  // on import regenerates names). Path is the unique unit for verify + merge.
  const seenPaths = new Set<string>();
  const entries = parsed.filter((e) => {
    if (seenPaths.has(e.path)) return false;
    seenPaths.add(e.path);
    return true;
  });

  const records: SnapshotRecord[] = [];
  for (const e of entries) {
    let rawText: string;
    try {
      rawText = await Deno.readTextFile(join(root, e.path));
    } catch {
      continue; // index references a file that isn't present — skip, don't invent
    }
    records.push({
      fqdn: e.fqdn,
      path: e.path,
      type: e.type,
      commitment: e.commitment,
      descriptor: parseDescriptorBlock(rawText),
      rawText,
    });
  }
  return {
    schema: "myc.public-snapshot.v0.1",
    record_count: records.length,
    records,
  };
}

/** Load a snapshot from a local file path or an http(s) URL — the transport layer of
 *  resonant exchange. A peer's network can arrive from a file, a peer's resolver, a
 *  plain file host, or the myc.md fallback; verification (verify_snapshot) is what
 *  makes any source safe. `fetchImpl` is injectable for tests (no real net needed). */
export async function loadSnapshot(
  source: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Snapshot> {
  if (/^https?:\/\//.test(source)) {
    const r = await fetchImpl(source);
    if (!r.ok) throw new Error(`fetch ${source}: HTTP ${r.status}`);
    return await r.json() as Snapshot;
  }
  return JSON.parse(await Deno.readTextFile(source)) as Snapshot;
}

async function main() {
  const args = Deno.args;
  const root = Deno.env.get("MYC_ROOT") ?? Deno.cwd();
  const snapshot = await buildSnapshot(root);
  const json = JSON.stringify(snapshot, null, 2);
  const writeIdx = args.indexOf("--write");
  if (writeIdx >= 0 && args[writeIdx + 1]) {
    await Deno.writeTextFile(args[writeIdx + 1], json + "\n");
    console.log(JSON.stringify(
      {
        type: "snapshot",
        ok: true,
        record_count: snapshot.record_count,
        written: args[writeIdx + 1],
      },
      null,
      2,
    ));
  } else {
    console.log(json);
  }
}

if (import.meta.main) await main();
