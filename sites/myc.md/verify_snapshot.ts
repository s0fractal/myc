#!/usr/bin/env -S deno run --allow-read --allow-write
// verify_snapshot.ts — Resonant Resolution: verify a snapshot (e.g. one received
// from a resonant peer) with myc's CANONICAL verifier. Trust the hash, not the host:
// a peer cannot inject a forged or tampered record, because every record is
// re-verified against its own commitment. Covers every descriptor type by rehydrating
// to a throwaway temp root and running verifyPath per record. (chord x6000_954726)
//
// Usage: deno run --allow-read --allow-write verify_snapshot.ts <snapshot.json>
//        ./t myc verify-snapshot <snapshot.json>
import { dirname, join } from "jsr:@std/path@1.1.4";
import {
  loadSnapshot,
  type Snapshot,
  type SnapshotRecord,
} from "./snapshot.ts";
import { verifyPath } from "../../src/x0100_myc.ts";

export interface SnapshotVerification {
  record_count: number;
  verified: number;
  failed: Array<{ fqdn: string; errors: string[] }>;
  verdict: "VERIFIED" | "FAILED";
}

/** Verify every record against its own commitment using myc's canonical verifyPath
 *  (all descriptor types). Rehydrates to a throwaway temp root; never touches the
 *  caller's tree. VERIFIED only when every record passes. */
export async function verifySnapshot(
  snapshot: Snapshot,
): Promise<SnapshotVerification> {
  const root = await Deno.makeTempDir({ prefix: "myc-verify-snapshot-" });
  try {
    const failed: Array<{ fqdn: string; errors: string[] }> = [];
    let verified = 0;
    for (const r of snapshot.records ?? []) {
      // A malformed record must be reported as FAILED, never crash the whole
      // verification — otherwise one bad record (e.g. a careless witnessed
      // publish) would make the snapshot unverifiable for everyone.
      try {
        const full = join(root, r.path);
        await Deno.mkdir(dirname(full), { recursive: true });
        await Deno.writeTextFile(full, r.rawText);
        const v = await verifyPath(full);
        if (v.ok) {
          verified++;
        } else {
          failed.push({
            fqdn: r.fqdn,
            errors: v.errors ?? ["verification failed"],
          });
        }
      } catch (e) {
        // The record itself may be null / not an object (a snapshot is untrusted
        // JSON, and loadSnapshot does not shape-validate), so read its fqdn
        // defensively — otherwise the catch that is supposed to contain one bad
        // record would itself throw and crash the whole verification.
        const rec = r as SnapshotRecord | null | undefined;
        failed.push({
          fqdn: rec?.fqdn ?? "(unknown)",
          errors: ["unparseable/invalid record: " + (e as Error).message],
        });
      }
    }
    return {
      record_count: (snapshot.records ?? []).length,
      verified,
      failed,
      verdict: failed.length === 0 ? "VERIFIED" : "FAILED",
    };
  } finally {
    await Deno.remove(root, { recursive: true }).catch(() => {});
  }
}

async function main() {
  const source = Deno.args[0];
  if (!source) {
    console.error(
      "usage: verify_snapshot.ts <snapshot.json | https://…/snapshot.json>",
    );
    Deno.exitCode = 2;
    return;
  }
  let snapshot: Snapshot;
  try {
    snapshot = await loadSnapshot(source);
  } catch (e) {
    console.log(JSON.stringify(
      {
        type: "snapshot-verification",
        verdict: "UNREADABLE",
        error: (e as Error).message,
      },
      null,
      2,
    ));
    Deno.exitCode = 2;
    return;
  }
  const v = await verifySnapshot(snapshot);
  console.log(JSON.stringify(
    {
      type: "snapshot-verification",
      ...v,
      meaning: v.verdict === "VERIFIED"
        ? "every record's content matches its commitment — safe to trust by hash"
        : "some records failed canonical verification — do NOT trust this snapshot",
    },
    null,
    2,
  ));
  if (v.verdict !== "VERIFIED") Deno.exitCode = 2;
}

if (import.meta.main) await main();
