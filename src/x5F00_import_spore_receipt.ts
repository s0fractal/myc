import { ensureDir } from "jsr:@std/fs@1.0.23";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { blake3 } from "npm:@noble/hashes@1.4.0/blake3";

const DOMAIN_APPLY = "spore.apply.v0";
const MAGIC = "53504f52";
const VERSION = 0x00;
const KIND_APPLY = 0x01;
const FLAG_HAS_EXPECT = 0x0001;
const ALGO_BLAKE3_256 = 0x1e;
const DIGEST_LEN = 32;

const TOOL_DIR = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(TOOL_DIR);
// Second CLI arg overrides the output dir — tests MUST pass a tempdir so a
// test run never rewrites the repo's committed receipts.
const OUTPUT_DIR = Deno.args[1] ??
  join(MYC_ROOT, "substrates", "spore", "receipts");

type Receipt = {
  type: "SPORE_APPLY_RECEIPT";
  spore_id: string;
  record_hex: string;
  mutator_hash: string;
  arg_hashes: string[];
  output_hash: string;
  body_fuel: number;
  total_fuel: number;
  trapped: boolean;
};

type ParsedRecord = {
  flags: number;
  argc: number;
  fHash: string;
  argHashes: string[];
  expectHash: string;
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid receipt: ${key} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(obj: Record<string, unknown>, key: string): boolean {
  const value = obj[key];
  if (typeof value !== "boolean") {
    throw new Error(`Invalid receipt: ${key} must be a boolean`);
  }
  return value;
}

function requireSafeInteger(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(
      `Invalid receipt: ${key} must be a non-negative safe integer`,
    );
  }
  return value as number;
}

function decodeHexStrict(
  hex: string,
  label: string,
  expectedBytes?: number,
): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`Invalid receipt: ${label} must be even-length hex`);
  }
  if (expectedBytes !== undefined && hex.length !== expectedBytes * 2) {
    throw new Error(
      `Invalid receipt: ${label} must be ${expectedBytes} bytes, got ${
        hex.length / 2
      }`,
    );
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function readDigest(record: Uint8Array, offset: number, label: string): {
  digest: string;
  next: number;
} {
  if (offset + 2 > record.length) {
    throw new Error(`Invalid SPORE record: missing ${label} multihash header`);
  }
  const algoTag = record[offset];
  const digestLen = record[offset + 1];
  const start = offset + 2;
  const end = start + digestLen;
  if (end > record.length) {
    throw new Error(`Invalid SPORE record: truncated ${label} digest`);
  }
  if (algoTag !== ALGO_BLAKE3_256 || digestLen !== DIGEST_LEN) {
    throw new Error(
      `Invalid SPORE record: ${label} must be BLAKE3-256 multihash`,
    );
  }
  return { digest: toHex(record.slice(start, end)), next: end };
}

function parseApplyRecord(recordHex: string): ParsedRecord {
  const record = decodeHexStrict(recordHex, "record_hex");
  if (record.length < 9) {
    throw new Error("Invalid SPORE record: too short");
  }
  if (toHex(record.slice(0, 4)) !== MAGIC) {
    throw new Error("Invalid SPORE record: bad magic");
  }
  if (record[4] !== VERSION) {
    throw new Error(`Invalid SPORE record: unsupported version ${record[4]}`);
  }
  if (record[5] !== KIND_APPLY) {
    throw new Error(`Invalid SPORE record: unsupported kind ${record[5]}`);
  }

  const flags = (record[6] << 8) | record[7];
  const argc = record[8];
  if ((flags & ~FLAG_HAS_EXPECT) !== 0) {
    throw new Error(
      `Invalid SPORE record: unsupported flags 0x${flags.toString(16)}`,
    );
  }
  if ((flags & FLAG_HAS_EXPECT) === 0) {
    throw new Error("Invalid SPORE record: expected output hash is required");
  }

  let offset = 9;
  const f = readDigest(record, offset, "f_hash");
  offset = f.next;

  const argHashes: string[] = [];
  for (let i = 0; i < argc; i++) {
    const arg = readDigest(record, offset, `arg_hash[${i}]`);
    argHashes.push(arg.digest);
    offset = arg.next;
  }

  const expect = readDigest(record, offset, "expect_hash");
  offset = expect.next;
  if (offset !== record.length) {
    throw new Error("Invalid SPORE record: trailing bytes after expected hash");
  }

  return {
    flags,
    argc,
    fHash: f.digest,
    argHashes,
    expectHash: expect.digest,
  };
}

function parseReceipt(rawReceipt: string): Receipt {
  const parsed = JSON.parse(rawReceipt) as Record<string, unknown>;
  if (parsed.type !== "SPORE_APPLY_RECEIPT") {
    throw new Error("Invalid input: not a SPORE_APPLY_RECEIPT");
  }

  const argHashesRaw = parsed.arg_hashes;
  if (!Array.isArray(argHashesRaw)) {
    throw new Error("Invalid receipt: arg_hashes must be an array");
  }
  const argHashes = argHashesRaw.map((value, index) => {
    if (typeof value !== "string") {
      throw new Error(`Invalid receipt: arg_hashes[${index}] must be a string`);
    }
    decodeHexStrict(value, `arg_hashes[${index}]`, DIGEST_LEN);
    return value.toLowerCase();
  });

  const receipt: Receipt = {
    type: "SPORE_APPLY_RECEIPT",
    spore_id: requireString(parsed, "spore_id").toLowerCase(),
    record_hex: requireString(parsed, "record_hex").toLowerCase(),
    mutator_hash: requireString(parsed, "mutator_hash").toLowerCase(),
    arg_hashes: argHashes,
    output_hash: requireString(parsed, "output_hash").toLowerCase(),
    body_fuel: requireSafeInteger(parsed, "body_fuel"),
    total_fuel: requireSafeInteger(parsed, "total_fuel"),
    trapped: requireBoolean(parsed, "trapped"),
  };

  decodeHexStrict(receipt.spore_id, "spore_id", DIGEST_LEN);
  decodeHexStrict(receipt.mutator_hash, "mutator_hash", DIGEST_LEN);
  decodeHexStrict(receipt.output_hash, "output_hash", DIGEST_LEN);
  return receipt;
}

function verifyReceipt(receipt: Receipt): ParsedRecord {
  const recordBytes = decodeHexStrict(receipt.record_hex, "record_hex");
  const computedSporeId = toHex(blake3(recordBytes, {
    context: DOMAIN_APPLY,
    dkLen: DIGEST_LEN,
  }));
  if (computedSporeId !== receipt.spore_id) {
    throw new Error("Invalid receipt: spore_id does not match record_hex");
  }

  const record = parseApplyRecord(receipt.record_hex);
  if (record.fHash !== receipt.mutator_hash) {
    throw new Error(
      "Invalid receipt: mutator_hash does not match apply record",
    );
  }
  if (record.expectHash !== receipt.output_hash) {
    throw new Error("Invalid receipt: output_hash does not match apply record");
  }
  if (record.argHashes.length !== receipt.arg_hashes.length) {
    throw new Error(
      "Invalid receipt: arg_hashes length does not match apply record",
    );
  }
  for (let i = 0; i < record.argHashes.length; i++) {
    if (record.argHashes[i] !== receipt.arg_hashes[i]) {
      throw new Error(
        `Invalid receipt: arg_hashes[${i}] does not match apply record`,
      );
    }
  }

  const expectedTotalFuel = receipt.body_fuel + 4 + record.argc;
  if (receipt.total_fuel !== expectedTotalFuel) {
    throw new Error(
      `Invalid receipt: total_fuel must equal body_fuel + 4 + argc (${expectedTotalFuel})`,
    );
  }

  return record;
}

async function importSporeReceipt() {
  if (!Deno.args[0]) {
    throw new Error(
      "Usage: deno run -A myc/tools/import_spore_receipt.ts <spore_receipt.json>",
    );
  }

  const rawReceipt = await Deno.readTextFile(Deno.args[0]);
  const receipt = parseReceipt(rawReceipt);
  const record = verifyReceipt(receipt);

  await ensureDir(OUTPUT_DIR);

  const content = `---
schema_version: "myc.spore.receipt.v0.1"
chord: ["oct:2.receipt", "oct:6.ledger", "oct:1.physics"]
energy: 1.0
tension: "Spore Apply Publication Receipt"
type: "SealedReceiptDescriptor"
intent_hash: "none"
status: "APPLIED"
signature: "unsigned"
fuel_model: "spore.fuel.v1"
record_verified: true
spore_id: "${receipt.spore_id}"
mutator_hash: "${receipt.mutator_hash}"
output_hash: "${receipt.output_hash}"
total_fuel: ${receipt.total_fuel}
trapped: ${receipt.trapped}
---

# Spore Receipt: ${receipt.spore_id.substring(0, 12)}

This descriptor publishes a SPORE.v0 apply receipt into MYC.
MYC verified descriptor consistency: the record hash, embedded multihashes,
argument count, and apply-boundary fuel agree. MYC did not execute the WASM
mutator.

## Execution Details

- **Spore ID**: \`${receipt.spore_id}\`
- **Mutator ($F_{hash}$)**: \`${receipt.mutator_hash}\`
- **Output Hash ($O_{hash}$)**: \`${receipt.output_hash}\`
- **Fuel Consumed**: ${receipt.total_fuel} ATP (Body: ${receipt.body_fuel} ATP)
- **Apply Boundary**: ${4 + record.argc} ATP
- **Arguments**: ${record.argc}
- **Flags**: 0x${record.flags.toString(16).padStart(4, "0")}
- **Trapped**: ${receipt.trapped}

### Argument Hashes ($A_{hash}$)
${receipt.arg_hashes.map((h) => `- \`${h}\``).join("\n")}

### Raw Record Hex
\`\`\`hex
${receipt.record_hex}
\`\`\`

> [!NOTE]
> Publication invariant verified: \`spore_id = BLAKE3.derive_key("spore.apply.v0", record_hex)\`.
> Execution validity still belongs to the SPORE executor or a stronger verifier.
`;

  const fileName = `receipt.${receipt.spore_id.substring(0, 12)}.myc.md`;
  const outPath = join(OUTPUT_DIR, fileName);

  await Deno.writeTextFile(outPath, content);
  console.log(
    `[MYC] Imported and verified SPORE receipt. Wrote descriptor to ${outPath}`,
  );
}

importSporeReceipt().catch((error) => {
  console.error(error);
  Deno.exit(1);
});
