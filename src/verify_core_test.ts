// Falsifier for audit A2: the shared verifier must FAIL on tampered content and
// PASS on valid — so the worker (which now calls it on /publish ingest) cannot be
// made to serve a record whose commitment doesn't match its body.
import { sha256Hex, stableStringify, verifyCommitment } from "./verify_core.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

Deno.test("verifyCommitment: valid passes, tampered/forged fails", async () => {
  const body = { coordinate: "x1234", note: "hello", n: 7 };
  const value = await sha256Hex(stableStringify(body));
  const commitment = { algorithm: "sha256", covers: "descriptor.body", value };

  const good = await verifyCommitment({ body, commitment });
  assert(good.ok, "valid commitment must pass: " + good.errors.join("; "));

  // tampered body, stale commitment → must FAIL (the P0 attack)
  const forged = await verifyCommitment({
    body: { ...body, note: "forged" },
    commitment,
  });
  assert(!forged.ok, "tampered body must fail commitment");

  // wrong algorithm / cover → must FAIL
  assert(
    !(await verifyCommitment({
      body,
      commitment: { ...commitment, algorithm: "md5" },
    })).ok,
    "wrong algorithm must fail",
  );
  assert(
    !(await verifyCommitment({
      body,
      commitment: { ...commitment, covers: "other" },
    })).ok,
    "wrong cover must fail",
  );
  // no commitment → must FAIL
  assert(
    !(await verifyCommitment({ body })).ok,
    "missing commitment must fail",
  );
});

Deno.test("stableStringify is key-order independent (canonical)", () => {
  assert(
    stableStringify({ b: 1, a: 2 } as never) ===
      stableStringify({ a: 2, b: 1 } as never),
    "stableStringify must be canonical (sorted keys)",
  );
});
