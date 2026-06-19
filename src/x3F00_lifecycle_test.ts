import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import { LIFECYCLE, lifecycle } from "./x3F00_lifecycle.ts";

// ── canonical commitment, to build a self-verifying publish fixture ─────────────
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

Deno.test("x3F00 lifecycle — defines one canonical vocabulary", () => {
  const states: string[] = LIFECYCLE.map((s) => s.state);
  for (
    const required of [
      "applied",
      "published",
      "witnessed",
      "resonant",
      "dormant",
      "invalid",
    ]
  ) {
    assert(states.includes(required), `vocabulary must include ${required}`);
  }
});

Deno.test("x3F00 lifecycle — classifies BOTH apply-receipts and consensus nodes", async () => {
  const o = await lifecycle();
  assertEquals(o.type, "lifecycle");
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const kinds = new Set(mutations.map((m) => m.kind));
  // the repo ships SPORE + phase apply-receipts AND a consensus publish node.
  assert(
    kinds.has("spore-apply") || kinds.has("phase"),
    "an apply-receipt should be present",
  );
  assert(kinds.has("consensus"), "a consensus node should be present");
});

Deno.test("x3F00 lifecycle — apply-receipts read as 'applied'", async () => {
  const o = await lifecycle();
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const applied = mutations.filter((m) =>
    m.kind === "spore-apply" || m.kind === "phase"
  );
  assert(applied.length >= 1);
  for (const m of applied) assertEquals(m.state, "applied");
});

Deno.test("x3F00 lifecycle — a proposal reads 'proposed' OR its terminal outcome", async () => {
  const o = await lifecycle();
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const ok = [
    "proposed",
    "resolution_claimed",
    "evidence_verified",
    "conflicted",
    "invalid",
    "implemented",
    "rejected",
    "superseded",
    "withdrawn",
    "expired",
  ];
  for (const m of mutations) {
    if (m.kind === "proposal") {
      assert(ok.includes(String(m.state)), `proposal state ${m.state} valid`);
    }
  }
});

Deno.test("x3F00 lifecycle — threads apply→published via derived_from", async () => {
  const root = await Deno.makeTempDir({ prefix: "lifecycle_thread_" });
  try {
    // a SPORE apply receipt with a known id
    const sporeId =
      "abc123def456abc123def456abc123def456abc123def456abc123def456abcd";
    const rdir = join(root, "substrates", "spore", "receipts");
    await Deno.mkdir(rdir, { recursive: true });
    await Deno.writeTextFile(
      join(rdir, "receipt.abc123def456.myc.md"),
      `---\nschema_version: "myc.spore.receipt.v0.1"\ntype: "SealedReceiptDescriptor"\nstatus: "APPLIED"\nspore_id: "${sporeId}"\ntotal_fuel: 10\n---\n\n# receipt\n`,
    );
    // a self-verifying publish descriptor whose derived_from points at that receipt
    const body = {
      publish_clearance: {
        target_fqdn: "t",
        target_commitment: "tc",
        export_scope: "closure",
      },
      publication_gates: {
        naming_proof_verified: true,
        graph_verified: true,
        payload_scrubbed: true,
      },
      destinations: [],
      derived_from: sporeId,
    };
    const value = await commit(body);
    const fqdn = "h.pubthreaded.publish.myc.md";
    const desc = {
      type: "PublishDescriptor",
      schema_version: "myc.publish.v0.1",
      fqdn,
      commitment: { algorithm: "sha256", value, covers: "descriptor.body" },
      body,
    };
    const pdir = join(root, "public", "consensus", "publish");
    await Deno.mkdir(pdir, { recursive: true });
    await Deno.writeTextFile(
      join(pdir, fqdn),
      '---\nchord:\n  primary: "oct:3.7"\n---\n\n# publish\n\n```json myc\n' +
        JSON.stringify(desc, null, 2) + "\n```\n",
    );

    const o = await lifecycle(root);
    const threads = o.threads as Array<{ applied: string; published: string }>;
    assertEquals(threads.length, 1, "the derived_from link must thread");
    assert(threads[0].applied.startsWith("abc123def456"));
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("x3F00 lifecycle — live membrane carries a real SPORE publication thread", async () => {
  const o = await lifecycle();
  const threads = o.threads as Array<{ applied: string; published: string }>;
  assert(
    threads.some((t) =>
      t.applied.startsWith("14b5a247729c690e") &&
      t.published.startsWith("h.2b9fe46da984.publish")
    ),
    "the committed membrane must preserve its real receipt→publication thread",
  );
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const published = mutations.find((m) =>
    String(m.id).startsWith("h.2b9fe46da984.publish")
  );
  assertEquals(published?.state, "resonant");
  assertEquals(
    published?.derived_from,
    "14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688",
  );
});

Deno.test("x3F00 lifecycle — consensus node carries a real trust state", async () => {
  const o = await lifecycle();
  const mutations = o.mutations as Array<Record<string, unknown>>;
  const consensus = mutations.filter((m) => m.kind === "consensus");
  for (const m of consensus) {
    assert(
      ["published", "witnessed", "reviewed", "resonant", "dormant", "invalid"]
        .includes(String(m.state)),
      `consensus state ${m.state} must be in the vocabulary`,
    );
  }
});
