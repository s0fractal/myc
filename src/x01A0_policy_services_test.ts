import * as facade from "./x0100_myc.ts";
import {
  adapterDryRun,
  explainAvailability,
  recipeDryRun,
  verificationReceipts,
} from "./x01A0_policy_services.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 facade preserves policy service bindings", () => {
  assert(facade.adapterDryRun === adapterDryRun, "adapter binding drift");
  assert(
    facade.explainAvailability === explainAvailability,
    "availability binding drift",
  );
  assert(facade.recipeDryRun === recipeDryRun, "recipe binding drift");
  assert(
    facade.verificationReceipts === verificationReceipts,
    "verification binding drift",
  );
});

Deno.test("adapter policy parsing is read-only and execution-disabled", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-policy-" });
  const dir = `${root}/substrates/demo`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/MYC.md`,
    [
      "adapter_policy:",
      "status: ready",
      "read_policy: descriptor-only",
      "write_policy: proposal-only",
      "payload_policy: commitment-only",
      "side_effects: [none]",
      "verification: [commitment, receipt]",
      "failure_mode: fail-closed",
    ].join("\n"),
  );

  const result = await adapterDryRun(root, "demo");
  assert(result.ok, result.errors.join("\n"));
  assert(result.execution_enabled === false, "execution became enabled");
  assert(result.status === "ready", "status parsing drift");
  assert(result.verification?.length === 2, "list parsing drift");
});

Deno.test("missing targets fail closed without inventing availability", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-policy-" });
  const target = "missing.example.myc.md";
  const availability = await explainAvailability(root, target);
  const recipe = await recipeDryRun(root, target);

  assert(!availability.ok, "missing target became available");
  assert(availability.access_mode === "none", "access mode should be none");
  assert(!recipe.ok, "missing recipe dry-run succeeded");
  assert(recipe.errors.length === 1, "missing recipe error drift");
});

Deno.test("verification receipt discovery is sorted and markdown-only", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-policy-" });
  const dir = `${root}/public/verification`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(`${dir}/z.md`, "z");
  await Deno.writeTextFile(`${dir}/a.md`, "a");
  await Deno.writeTextFile(`${dir}/ignored.txt`, "ignored");

  const records = await verificationReceipts(root);
  assert(records.length === 2, "non-markdown receipt leaked into discovery");
  assert(records[0].name === "a.md", "receipt order is not deterministic");
  assert(
    records[0].path === "public/verification/a.md",
    "receipt path is not portable",
  );
});
