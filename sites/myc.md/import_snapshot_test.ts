import { dirname, join } from "jsr:@std/path@1.1.4";
import { buildSnapshot } from "./snapshot.ts";
import { applyImport, planImport } from "./import_snapshot.ts";
import { captureText } from "../../src/x0100_myc.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("import-snapshot: verify-then-merge, dry-run safe, idempotent, conflicts flagged", async () => {
  // a peer builds a network export
  const peer = await Deno.makeTempDir({ prefix: "myc-peer-" });
  await captureText({
    root: peer,
    text: "a peer's contributed thought",
    actor: "s0fractal",
    kind: "message",
  });
  const snap = await buildSnapshot(peer);
  assert(snap.record_count > 0, "peer has records");

  // local empty → every verified record is new; dry-run (planImport) writes nothing
  const local = await Deno.makeTempDir({ prefix: "myc-local-" });
  const plan = await planImport(snap, local);
  assert(
    plan.new_paths.length === snap.record_count,
    "all peer records are new",
  );
  assert(plan.rejected.length === 0, "an honest snapshot has no rejects");
  assert(plan.conflicts.length === 0, "no conflicts on empty local");
  let wroteNothing = true;
  try {
    await Deno.stat(join(local, "public"));
    wroteNothing = false;
  } catch { /* nothing written */ }
  assert(wroteNothing, "planImport is a dry-run — it writes nothing");

  // apply → records land + reindex; re-import is idempotent (all existing)
  const written = await applyImport(snap, local, plan);
  assert(written === snap.record_count, "applied all new records");
  const plan2 = await planImport(snap, local);
  assert(
    plan2.new_paths.length === 0 &&
      plan2.existing_paths.length === snap.record_count,
    "re-import is idempotent (everything already present)",
  );

  // a tampered record is rejected and never eligible to merge
  // corrupt the commitment value of one record → its body no longer matches its
  // stated commitment → verifyPath rejects it
  const tIdx = snap.records.findIndex((r) =>
    /"value":\s*"[0-9a-f]{40,}"/.test(r.rawText)
  );
  assert(tIdx >= 0, "found a record with a commitment value to corrupt");
  const tampered = {
    ...snap,
    records: snap.records.map((r, i) =>
      i === tIdx
        ? {
          ...r,
          rawText: r.rawText.replace(
            /("value":\s*")([0-9a-f]{40,})/,
            (_m, p, h) => p + ((h[0] === "0" ? "1" : "0") + h.slice(1)),
          ),
        }
        : r
    ),
  };
  const fresh = await Deno.makeTempDir({ prefix: "myc-fresh-" });
  const planT = await planImport(tampered, fresh);
  assert(planT.rejected.length >= 1, "tampered record is rejected");
  assert(
    !planT.new_paths.includes(snap.records[tIdx].path),
    "a rejected record is never eligible to merge",
  );

  // a conflict (same path, different local bytes) is flagged, never overwritten
  const conflictRoot = await Deno.makeTempDir({ prefix: "myc-conflict-" });
  const rec = snap.records[0];
  const cpath = join(conflictRoot, rec.path);
  await Deno.mkdir(dirname(cpath), { recursive: true });
  await Deno.writeTextFile(cpath, "DIFFERENT LOCAL CONTENT\n");
  const planC = await planImport(snap, conflictRoot);
  assert(
    planC.conflicts.some((c) => c.path === rec.path),
    "a divergent same-path record is a conflict",
  );
  assert(
    !planC.new_paths.includes(rec.path),
    "a conflict path is not eligible to merge",
  );
  // and applying the plan must NOT overwrite the divergent local file
  await applyImport(snap, conflictRoot, planC);
  assert(
    (await Deno.readTextFile(cpath)) === "DIFFERENT LOCAL CONTENT\n",
    "a conflict is never overwritten by apply",
  );
});
