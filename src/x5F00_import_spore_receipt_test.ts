import { assertRejects } from "jsr:@std/assert";

const IMPORTER_PATH =
  new URL("./x5F00_import_spore_receipt.ts", import.meta.url).pathname;

// A valid receipt taken directly from the bridge's correct output
const VALID_RECEIPT = {
  type: "SPORE_APPLY_RECEIPT",
  spore_id: "14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688",
  record_hex:
    "53504f5200010001011e205bd70a84dce70b28c018ddbe253d1ef96557007816a7ecaa9c4609a2524ca10d1e20ed1c6b56db653a6d4e71d363f70b3dc4efa4b36b3f844663bd171e07350fdf991e20cf42e43aee73abbbfbcdec23fa8b2c66162ce579a160e8cbadfbcf4693bd138a",
  mutator_hash:
    "5bd70a84dce70b28c018ddbe253d1ef96557007816a7ecaa9c4609a2524ca10d",
  arg_hashes: [
    "ed1c6b56db653a6d4e71d363f70b3dc4efa4b36b3f844663bd171e07350fdf99",
  ],
  output_hash:
    "cf42e43aee73abbbfbcdec23fa8b2c66162ce579a160e8cbadfbcf4693bd138a",
  body_fuel: 644,
  total_fuel: 649,
  trapped: false,
  timestamp: "2026-05-12T03:37:54.000Z",
};

async function runImporter(receiptData: object): Promise<void> {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  await Deno.writeTextFile(tmpFile, JSON.stringify(receiptData));

  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", IMPORTER_PATH, tmpFile],
    stdout: "piped",
    stderr: "piped",
  });

  const { success, stderr } = await cmd.output();
  await Deno.remove(tmpFile);

  if (!success) {
    const errorMsg = new TextDecoder().decode(stderr);
    throw new Error(errorMsg);
  }
}

Deno.test("MYC Importer - Valid Receipt", async () => {
  await runImporter(VALID_RECEIPT);
});

Deno.test("MYC Importer - Invalid total_fuel", async () => {
  const tampered = { ...VALID_RECEIPT, total_fuel: 999 };
  await assertRejects(
    () => runImporter(tampered),
    Error,
    "Invalid receipt: total_fuel must equal body_fuel + 4 + argc",
  );
});

Deno.test("MYC Importer - Invalid output_hash", async () => {
  const tampered = {
    ...VALID_RECEIPT,
    output_hash: "ff" + VALID_RECEIPT.output_hash.substring(2),
  };
  await assertRejects(
    () => runImporter(tampered),
    Error,
    "Invalid receipt: output_hash does not match apply record",
  );
});

Deno.test("MYC Importer - Invalid record_hex (tampered payload)", async () => {
  const tampered = {
    ...VALID_RECEIPT,
    record_hex: VALID_RECEIPT.record_hex.substring(
      0,
      VALID_RECEIPT.record_hex.length - 2,
    ) + "ff",
  };
  await assertRejects(
    () => runImporter(tampered),
    Error,
    "Invalid receipt: spore_id does not match record_hex",
  );
});

Deno.test("MYC Importer - Invalid spore_id", async () => {
  const tampered = {
    ...VALID_RECEIPT,
    spore_id: "ff" + VALID_RECEIPT.spore_id.substring(2),
  };
  await assertRejects(
    () => runImporter(tampered),
    Error,
    "Invalid receipt: spore_id does not match record_hex",
  );
});
