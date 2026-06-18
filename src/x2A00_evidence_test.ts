import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import { verifyEvidence } from "./x2A00_evidence.ts";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stable(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  return `{${
    Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")
  }}`;
}
async function commit(body: Json): Promise<string> {
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stable(body)),
  );
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

const FULL = "a".repeat(40);

Deno.test("x2A00 — commit: a full git id matching its commitment is valid", async () => {
  const r = await verifyEvidence({
    kind: "commit",
    ref: FULL,
    commitment: FULL,
  });
  assert(r.valid, r.reason);
});

Deno.test("x2A00 — commit: an ABBREVIATED git ref is invalid", async () => {
  const r = await verifyEvidence({
    kind: "commit",
    ref: "40b667f",
    commitment: "40b667f",
  });
  assert(!r.valid);
  assert(/abbreviated|non-canonical/.test(r.reason));
});

Deno.test("x2A00 — commit: commitment != object id is invalid", async () => {
  const r = await verifyEvidence({
    kind: "commit",
    ref: FULL,
    commitment: "b".repeat(40),
  });
  assert(!r.valid);
});

Deno.test("x2A00 — unknown evidence kind is invalid", async () => {
  const r = await verifyEvidence({ kind: "built", ref: "x", commitment: "y" });
  assert(!r.valid);
  assert(/unknown evidence kind/.test(r.reason));
});

Deno.test("x2A00 — empty ref or commitment is invalid", async () => {
  assert(
    !(await verifyEvidence({ kind: "commit", ref: "", commitment: FULL }))
      .valid,
  );
  assert(
    !(await verifyEvidence({ kind: "commit", ref: FULL, commitment: "" }))
      .valid,
  );
});

Deno.test("x2A00 — descriptor: resolves, self-verifies, commitment matches → valid", async () => {
  const root = await Deno.makeTempDir({ prefix: "ev_" });
  try {
    const body = { publish_clearance: { target_fqdn: "t" }, destinations: [] };
    const c = await commit(body as Json);
    const fqdn = "h.realpub.publish.myc.md";
    const dir = join(root, "public", "consensus", "publish");
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      join(dir, fqdn),
      "---\nx: 1\n---\n\n```json myc\n" +
        JSON.stringify(
          {
            type: "PublishDescriptor",
            fqdn,
            commitment: {
              algorithm: "sha256",
              value: c,
              covers: "descriptor.body",
            },
            body,
          },
          null,
          2,
        ) +
        "\n```\n",
    );
    const ok = await verifyEvidence({
      kind: "publish",
      ref: fqdn,
      commitment: c,
    }, { root });
    assert(ok.valid, ok.reason);
    // wrong commitment for a real descriptor → invalid
    const bad = await verifyEvidence({
      kind: "publish",
      ref: fqdn,
      commitment: "z".repeat(64),
    }, { root });
    assert(!bad.valid);
    // absent target → invalid
    const miss = await verifyEvidence({
      kind: "publish",
      ref: "h.nope.publish.myc.md",
      commitment: c,
    }, { root });
    assert(!miss.valid);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("x2A00 — apply: a spore receipt bound by spore_id is valid; mismatch invalid", async () => {
  const root = await Deno.makeTempDir({ prefix: "ev_" });
  try {
    const sporeId = "s".repeat(64);
    const dir = join(root, "substrates", "spore", "receipts");
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      join(dir, "receipt.s.myc.md"),
      `---\ntype: "SealedReceiptDescriptor"\nstatus: "APPLIED"\nspore_id: "${sporeId}"\n---\n\n# r\n`,
    );
    const ok = await verifyEvidence({
      kind: "apply",
      ref: "receipt.s.myc.md",
      commitment: sporeId,
    }, { root });
    assert(ok.valid, ok.reason);
    const bad = await verifyEvidence({
      kind: "apply",
      ref: "receipt.s.myc.md",
      commitment: "x",
    }, { root });
    assert(!bad.valid);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("x2A00 — omega proof verification is honestly deferred (invalid in v0)", async () => {
  const r = await verifyEvidence({
    kind: "omega",
    ref: "0x30A95260",
    commitment: "x",
  });
  assert(!r.valid);
  assert(/deferred/.test(r.reason));
});
