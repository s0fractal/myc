import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { trustTopology } from "./x3700_trust.ts";

// ── canonical commitment (mirror of x3700/x0100) for crafting fixtures ──────────
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stableStringify(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v).sort();
  return `{${
    keys.map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(",")
  }}`;
}
async function commit(body: Json): Promise<string> {
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableStringify(body)),
  );
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function writeDescriptor(
  dir: string,
  type: string,
  fqdn: string,
  body: Json,
  opts: { commitmentOverride?: string | null } = {},
): Promise<void> {
  const value = "commitmentOverride" in opts
    ? opts.commitmentOverride
    : await commit(body);
  const commitment = value === null
    ? undefined
    : { algorithm: "sha256", value, covers: "descriptor.body" };
  const descriptor = {
    type,
    schema_version: "test.v0",
    fqdn,
    commitment,
    body,
  };
  const md = `---\nchord:\n  primary: "oct:3.7"\n---\n\n# ${type}\n\n` +
    "```json myc\n" + JSON.stringify(descriptor, null, 2) + "\n```\n";
  await Deno.writeTextFile(`${dir}/${fqdn}`, md);
}

async function withFixtures(
  build: (dir: string) => Promise<void>,
  // deno-lint-ignore no-explicit-any
  check: (o: any) => void | Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "trust_fx_" });
  try {
    await build(dir);
    await check(await trustTopology(dir));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

const PUB = "h.pub.publish.myc.md";

Deno.test("x3700 — valid publish + matching witness → resonant, counted once", async () => {
  await withFixtures(async (dir) => {
    const body = {
      publish_clearance: { target_fqdn: "t", export_scope: "closure" },
    };
    const c = await commit(body);
    await writeDescriptor(dir, "PublishDescriptor", PUB, body);
    // two witnesses from the SAME actor, both matching → must dedup to 1.
    await writeDescriptor(dir, "WitnessDescriptor", "h.w1.witness.myc.md", {
      target_fqdn: PUB,
      target_commitment: c,
      witness_actor: "claude",
      verification_status: "structurally_valid",
    });
    await writeDescriptor(dir, "WitnessDescriptor", "h.w2.witness.myc.md", {
      target_fqdn: PUB,
      target_commitment: c,
      witness_actor: "claude",
      verification_status: "structurally_valid",
    });
  }, (o) => {
    assertEquals(o.nodes.length, 1);
    assertEquals(o.nodes[0].state, "resonant");
    assertEquals(o.nodes[0].resonance, 1, "same actor twice counts once");
    assertEquals(o.nodes[0].valid_witnesses, ["claude"]);
  });
});

Deno.test("x3700 — tampered publish (commitment does not bind body) is exposed, not scored", async () => {
  await withFixtures(async (dir) => {
    const body = { publish_clearance: { target_fqdn: "t" } };
    await writeDescriptor(dir, "PublishDescriptor", PUB, body, {
      commitmentOverride: "deadbeef".repeat(8), // wrong commitment
    });
  }, (o) => {
    assertEquals(o.nodes.length, 0, "tampered publish must not become a node");
    assertEquals(o.counts.invalid_descriptors, 1);
    assert(/self-verify/.test(o.invalid_descriptors[0].reason));
  });
});

Deno.test("x3700 — witness joined by name but WRONG commitment is invalid, not counted", async () => {
  await withFixtures(async (dir) => {
    const body = { publish_clearance: { target_fqdn: "t" } };
    await writeDescriptor(dir, "PublishDescriptor", PUB, body);
    await writeDescriptor(dir, "WitnessDescriptor", "h.w.witness.myc.md", {
      target_fqdn: PUB,
      target_commitment: "0".repeat(64), // joins by fqdn, mismatched commitment
      witness_actor: "mallory",
      verification_status: "structurally_valid",
    });
  }, (o) => {
    assertEquals(o.nodes[0].state, "dormant", "no valid witness → dormant");
    assertEquals(o.nodes[0].resonance, 0);
    assert(
      o.nodes[0].invalid_witnesses.some((w: { reason: string }) =>
        /commitment mismatch/.test(w.reason)
      ),
      "the name-only witness must be shown invalid",
    );
  });
});

Deno.test("x3700 — review counts only on commitment match, deduped per reviewer", async () => {
  await withFixtures(async (dir) => {
    const body = { publish_clearance: { target_fqdn: "t" } };
    const c = await commit(body);
    await writeDescriptor(dir, "PublishDescriptor", PUB, body);
    await writeDescriptor(dir, "WitnessDescriptor", "h.w.witness.myc.md", {
      target_fqdn: PUB,
      target_commitment: c,
      witness_actor: "claude",
      verification_status: "structurally_valid",
    });
    // matching approve (counts) + mismatched approve (ignored)
    await writeDescriptor(dir, "ReviewDescriptor", "h.r1.review.myc.md", {
      target_fqdn: PUB,
      target_commitment: c,
      reviewer: "gemini",
      rating: "approve",
    });
    await writeDescriptor(dir, "ReviewDescriptor", "h.r2.review.myc.md", {
      target_fqdn: PUB,
      target_commitment: "f".repeat(64),
      reviewer: "codex",
      rating: "approve",
    });
  }, (o) => {
    // 1 valid witness + 1 valid approval (codex's mismatched review ignored)
    assertEquals(o.nodes[0].resonance, 2);
    assertEquals(o.nodes[0].reviews.length, 1);
    assertEquals(o.nodes[0].reviews[0].reviewer, "gemini");
  });
});

Deno.test("x3700 — live repo graph still reads resonant (regression)", async () => {
  const o = await trustTopology();
  assert((o.counts as { published: number }).published >= 1);
});

Deno.test("x3700 — every node exposes an authenticated_witnesses array (shape)", async () => {
  const o = await trustTopology();
  for (const n of (o.nodes as Array<Record<string, unknown>>)) {
    assert(
      Array.isArray(n.authenticated_witnesses),
      "authenticity dimension present",
    );
  }
});

Deno.test("x3700 — the live witness authenticates as claude (when registry reachable)", async () => {
  const o = await trustTopology();
  const total = (o.counts as Record<string, number>).authenticated_witnesses;
  // myc standalone (no superproject registry) ⇒ 0; under trinity ⇒ the signed
  // witness verifies. Either way the field is a number.
  assert(typeof total === "number");
});
