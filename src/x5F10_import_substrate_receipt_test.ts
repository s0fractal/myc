import {
  assert,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { importReceipt } from "./x5F10_import_substrate_receipt.ts";

const VALID_PHI_RECEIPT = {
  type: "PHI_RECEIPT",
  intent_hash: "a1b2c3d4e5f6708192a3b4c5d6e7f8091a2b3c4d5e6f70819",
  status: "VERIFIED",
  derived_phase: 3,
  receipt_signature: "ed25519:deadbeefcafef00d",
  timestamp: "2026-05-12T03:37:54.000Z",
};

async function withTmpReceipt(
  receipt: object,
  fn: (inputPath: string, outDir: string) => Promise<void>,
): Promise<void> {
  const inputPath = await Deno.makeTempFile({ suffix: ".json" });
  const outDir = await Deno.makeTempDir({ prefix: "phi_receipts_" });
  await Deno.writeTextFile(inputPath, JSON.stringify(receipt));
  try {
    await fn(inputPath, outDir);
  } finally {
    await Deno.remove(inputPath).catch(() => {});
    await Deno.remove(outDir, { recursive: true }).catch(() => {});
  }
}

Deno.test("x5F10 — imports a valid PHI_RECEIPT into a content-addressed file", async () => {
  await withTmpReceipt(VALID_PHI_RECEIPT, async (inputPath, outDir) => {
    const outPath = await importReceipt(inputPath, outDir);
    assertStringIncludes(outPath, outDir);
    assert(/receipt\.[0-9a-f]{12}\.myc\.md$/.test(outPath), outPath);
    const body = await Deno.readTextFile(outPath);
    assertStringIncludes(body, 'type: "SealedReceiptDescriptor"');
    assertStringIncludes(body, "VERIFIED");
    assertStringIncludes(body, VALID_PHI_RECEIPT.receipt_signature);
  });
});

Deno.test("x5F10 — is deterministic: same receipt → same file name", async () => {
  let firstOut = "";
  await withTmpReceipt(VALID_PHI_RECEIPT, async (inputPath, outDir) => {
    firstOut = await importReceipt(inputPath, outDir);
  });
  let secondOut = "";
  await withTmpReceipt(VALID_PHI_RECEIPT, async (inputPath, outDir) => {
    secondOut = await importReceipt(inputPath, outDir);
  });
  // Content hash drives the name, so the basename is stable across runs.
  assert(
    firstOut.split("/").pop() === secondOut.split("/").pop(),
    `${firstOut} vs ${secondOut}`,
  );
});

Deno.test("x5F10 — rejects a non-PHI receipt", async () => {
  await withTmpReceipt(
    { type: "NOT_A_PHI_RECEIPT" },
    async (inputPath, outDir) => {
      await assertRejects(
        () => importReceipt(inputPath, outDir),
        Error,
        "not a PHI_RECEIPT",
      );
    },
  );
});
