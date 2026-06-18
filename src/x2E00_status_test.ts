import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { statusReceipt } from "./x2E00_status.ts";

// A real myc root (the substrate root, two levels up from this test file's dir).
const MYC_ROOT = new URL("../", import.meta.url).pathname;

Deno.test("x2E00 status — healthy on a complete root", async () => {
  const receipt = await statusReceipt(MYC_ROOT);
  assertEquals(receipt.position, "2/E");
  assertEquals(receipt.substrate, "myc");
  const health = receipt.substrate_health as Record<string, unknown>;
  assertEquals(health.overall, "healthy");
  // myc is the publication layer; it abstains on physical law.
  assertEquals(health.law_hash, null);
  assertEquals(receipt.law_hash, null);
  const own = health.own_components as Record<string, number>;
  assertEquals(own.fail, 0);
  assertEquals(own.ok, own.total);
});

Deno.test("x2E00 status — degraded on an empty root", async () => {
  const empty = await Deno.makeTempDir({ prefix: "myc_status_" });
  try {
    const receipt = await statusReceipt(empty);
    const health = receipt.substrate_health as Record<string, unknown>;
    assertEquals(health.overall, "degraded");
    const own = health.own_components as Record<string, number>;
    assertEquals(own.ok, 0);
    assert(own.fail > 0);
  } finally {
    await Deno.remove(empty, { recursive: true });
  }
});

Deno.test("x2E00 status — --envelope attaches a signed health envelope", async () => {
  const receipt = await statusReceipt(MYC_ROOT, { envelope: true });
  const env = receipt.substrate_health_envelope as Record<string, unknown>;
  assert(env, "envelope should be present when requested");
  assertEquals(env.substrate_tag, "myc");
});

Deno.test("x2E00 status — no envelope by default", async () => {
  const receipt = await statusReceipt(MYC_ROOT);
  assertEquals(receipt.substrate_health_envelope, undefined);
});

// Defensive: ensure the organ never leaks a host absolute path into output.
Deno.test("x2E00 status — output carries no host path leak", async () => {
  const receipt = await statusReceipt(MYC_ROOT);
  const json = JSON.stringify(receipt);
  assert(!json.includes(join(MYC_ROOT, "src")), "must not embed local paths");
});
