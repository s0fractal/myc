import { buildSnapshot } from "./snapshot.ts";
import { verifySnapshot } from "./verify_snapshot.ts";
import { captureText } from "../../src/x0100_myc.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("verifySnapshot: canonical per-record verification, trust the hash", async () => {
  // seed a temp root with REAL myc descriptors, then snapshot it
  const root = await Deno.makeTempDir({ prefix: "myc-vs-" });
  await captureText({
    root,
    text: "a verifiable thought from a peer",
    actor: "s0fractal",
    kind: "message",
  });
  const snap = await buildSnapshot(root);
  assert(snap.record_count > 0, "captured descriptors are present");

  // an honest snapshot verifies (every record passes canonical verifyPath)
  const good = await verifySnapshot(snap);
  assert(
    good.verdict === "VERIFIED",
    "honest snapshot verifies: " + JSON.stringify(good.failed),
  );
  assert(good.verified === snap.record_count, "every record verified");

  // corrupt the committed content (flip the first byte of the 64-hex commitment
  // hash) → the recomputed body hash no longer matches the stated commitment → FAILED.
  // (Note: trailing prose outside the committed body would NOT break it — the
  // commitment covers the body, not the whole file.)
  const tampered = {
    ...snap,
    records: snap.records.map((r, i) =>
      i === 0
        ? {
          ...r,
          rawText: r.rawText.replace(
            /[0-9a-f]{40,}/,
            (m) => (m[0] === "0" ? "1" : "0") + m.slice(1),
          ),
        }
        : r
    ),
  };
  const bad = await verifySnapshot(tampered);
  assert(bad.verdict === "FAILED", "a tampered record is caught");
  assert(bad.failed.length >= 1, "the tampered record is reported");

  // an empty snapshot is vacuously verified (no records to fail)
  const empty = await verifySnapshot({
    schema: "myc.public-snapshot.v0.1",
    record_count: 0,
    records: [],
  });
  assert(
    empty.verdict === "VERIFIED",
    "empty snapshot verdict is well-defined",
  );
});
