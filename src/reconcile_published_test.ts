// Falsifier for audit A11: content published to the live membrane lives only in
// Cloudflare KV until reconciled. reconcilePublished folds a verified record's
// rawText into the durable git tree (public/), so it survives KV eviction — and
// REFUSES a forged record (commitment ≠ body), because durability must never
// fossilize a forgery.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reconcilePublished, sha256Hex, stableStringify } from "./x0100_myc.ts";

async function fileExists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

Deno.test("A11: reconcile makes a KV-only record durable; forged is refused", async () => {
  const root = await Deno.makeTempDir();
  try {
    const body = { note: "durable content", n: 1 };
    const value = await sha256Hex(stableStringify(body));
    const descriptor = {
      type: "RawDescriptor",
      schema_version: "myc.raw.v0.1",
      fqdn: "h.deadbeef0001.durable.tester.raw.myc.md",
      commitment: { algorithm: "sha256", covers: "descriptor.body", value },
      body,
    };
    const rec = {
      fqdn: descriptor.fqdn,
      path:
        "public/objects/h/deadbeef0001/h.deadbeef0001.durable.tester.raw.myc.md",
      rawText: "# durable\n\n```json myc\n" +
        JSON.stringify(descriptor, null, 2) + "\n```\n",
      descriptor: { body, commitment: descriptor.commitment },
    };
    const abs = `${root}/${rec.path}`;

    assert(
      !(await fileExists(abs)),
      "record must not be durable before reconcile",
    );
    const res = await reconcilePublished(root, [rec]);
    assert(res.reconciled.length === 1, "valid record must reconcile");
    assert(
      await fileExists(abs),
      "record must be durable on disk after reconcile",
    );

    // idempotent: a second reconcile skips it
    const again = await reconcilePublished(root, [rec]);
    assert(
      again.skipped.length === 1 && again.reconciled.length === 0,
      "already-durable record must be skipped (idempotent)",
    );

    // forged: commitment does not match a tampered body → REFUSED, not written
    const forged = {
      fqdn: "h.forged.raw.myc.md",
      path: "public/objects/h/forged/h.forged.raw.myc.md",
      rawText: "forged",
      descriptor: {
        body: { ...body, note: "TAMPERED" },
        commitment: descriptor.commitment,
      },
    };
    const res2 = await reconcilePublished(root, [forged]);
    assert(
      res2.rejected.length === 1 && res2.reconciled.length === 0,
      "forged record must be refused (durability must not fossilize a forgery)",
    );
    assert(
      !(await fileExists(`${root}/${forged.path}`)),
      "forged record must NOT be written to the durable tree",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
