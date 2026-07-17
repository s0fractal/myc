import * as facade from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import { parseDescriptorFile } from "./x0150_descriptor_index.ts";
import { writeDescriptorFile } from "./x01B0_descriptor_store.ts";
import {
  importGraph,
  publishTarget,
  reviewTarget,
  witnessTarget,
} from "./x01C0_mutation_lifecycle.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 facade preserves mutation lifecycle bindings", () => {
  assert(facade.publishTarget === publishTarget, "publish binding drift");
  assert(facade.importGraph === importGraph, "import binding drift");
  assert(facade.witnessTarget === witnessTarget, "witness binding drift");
  assert(facade.reviewTarget === reviewTarget, "review binding drift");
});

Deno.test("descriptor store preserves generated descriptor identity", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-lifecycle-" });
  const descriptor = await makeDescriptor(
    "IntentDescriptor",
    "0.1.0",
    "intent.example.myc.md",
    { intent: "test", oct: "oct:5.1" },
  );
  const path = `${root}/nested/intent.myc.md`;
  await writeDescriptorFile(path, descriptor, "Intent", "roundtrip");
  const parsed = await parseDescriptorFile(path);
  assert(parsed.fqdn === descriptor.fqdn, "fqdn changed during persistence");
  assert(
    parsed.commitment.value === descriptor.commitment.value,
    "commitment changed during persistence",
  );
});

Deno.test("mutation entrypoints fail closed before unauthorized writes", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-lifecycle-" });
  const target = "missing.example.myc.md";
  const published = await publishTarget(root, target);
  const witnessed = await witnessTarget(root, target, "actor");
  const reviewed = await reviewTarget(root, target, "reviewer", "invalid");
  const imported = await importGraph(root, `${root}/missing.ndjson`);

  assert(!published.ok, "missing target was published");
  assert(!witnessed.ok, "missing target was witnessed");
  assert(!reviewed.ok, "invalid rating was reviewed");
  assert(!imported.ok && imported.imported === 0, "missing bundle imported");
});

Deno.test("import rejects forged commitments without writing descriptors", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-lifecycle-" });
  const bundle = `${root}/forged.ndjson`;
  await Deno.writeTextFile(
    bundle,
    JSON.stringify({
      type: "IntentDescriptor",
      schema_version: "0.1.0",
      fqdn: "intent.actor.h.deadbeefdead.myc.md",
      commitment: {
        algorithm: "sha256",
        value: "forged",
        covers: "descriptor.body",
      },
      body: { intent: "forged" },
    }) + "\n",
  );

  const result = await importGraph(root, bundle);
  assert(!result.ok, "forged bundle imported");
  assert(result.imported === 0, "forged descriptor was written");
  assert(
    result.errors[0]?.includes("invalid commitment"),
    "forgery error missing",
  );
});
