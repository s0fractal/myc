import {
  parseDescriptorFile,
  verifyDescriptor as verifyFromFacade,
} from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import {
  parseDescriptorText,
  verifyDescriptor,
} from "./x0120_descriptor_verify.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 keeps descriptor verification as a compatibility façade", () => {
  assert(verifyFromFacade === verifyDescriptor, "verify binding drifted");
});

Deno.test("descriptor text parser matches the filesystem façade", async () => {
  const path = await Deno.makeTempFile({ suffix: ".myc.md" });
  try {
    const descriptor = await makeDescriptor(
      "TestDescriptor",
      "test.v0.1",
      "test.myc.md",
      { value: "same bytes" },
    );
    const text = `# test\n\n\`\`\`json myc\n${
      JSON.stringify(descriptor)
    }\n\`\`\`\n`;
    await Deno.writeTextFile(path, text);
    const direct = await parseDescriptorText(text, path);
    const facade = await parseDescriptorFile(path);
    assert(JSON.stringify(direct) === JSON.stringify(facade), "parser drifted");
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("frontmatter fallback stays deterministic without filesystem access", async () => {
  const descriptor = await parseDescriptorText(
    "---\ntype: chord.receipt\nstatus: active\nlabels:\n  - one\n  - two\n---\n",
    "x7700_example.myc.md",
  );
  assert(descriptor.type === "chord.receipt", "type drifted");
  assert(descriptor.body.coordinate === "x7700", "coordinate drifted");
  assert(descriptor.body.status === "active", "status drifted");
  assert(Array.isArray(descriptor.body.labels), "list parsing drifted");
  assert((await verifyDescriptor(descriptor)).ok, "fallback must self-verify");
});

Deno.test("descriptor parser and artifact verifier fail closed", async () => {
  let rejected = false;
  try {
    await parseDescriptorText(
      '```json myc\n{"type":"missing-fields"}\n```',
      "bad.myc.md",
    );
  } catch (error) {
    rejected = error instanceof Error &&
      /Invalid MYC descriptor/.test(error.message);
  }
  assert(rejected, "malformed descriptor must be rejected");

  const artifact = await makeDescriptor(
    "ArtifactDescriptor",
    "artifact.v0.1",
    "artifact.myc.md",
    { artifact_hash: "forged", formula: { input: { a: 1 } } },
  );
  const verdict = await verifyDescriptor(artifact);
  assert(!verdict.ok, "forged artifact formula must fail");
  assert(
    verdict.errors.some((error) => error.includes("Artifact formula mismatch")),
    "artifact failure must remain explicit",
  );
});
