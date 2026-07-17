import {
  rebuildIndex as rebuildFromFacade,
  verifyProjections as verifyFromFacade,
} from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import {
  indexLines,
  rebuildIndex,
  sameNdjsonLines,
  verifyProjections,
} from "./x0170_projections.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function writeDescriptor(
  path: string,
  descriptor: unknown,
): Promise<void> {
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeTextFile(
    path,
    `# fixture\n\n\`\`\`json myc\n${JSON.stringify(descriptor)}\n\`\`\`\n`,
  );
}

Deno.test("x0100 keeps projection exports as a compatibility façade", () => {
  assert(rebuildFromFacade === rebuildIndex, "rebuildIndex binding drifted");
  assert(verifyFromFacade === verifyProjections, "verify binding drifted");
});

Deno.test("index projection is deterministic, relative, and alias-complete", async () => {
  const root = "/repo";
  const descriptor = await makeDescriptor(
    "ArtifactDescriptor",
    "artifact.v0.1",
    "z.mutable.myc.md",
    { immutable_fqdn: "a.immutable.myc.md" },
  );
  const lines = indexLines(root, [{
    path: "/repo/public/z.myc.md",
    descriptor,
  }]);
  assert(lines.length === 2, "alias row missing");
  assert(lines[0].includes("a.immutable.myc.md"), "rows are not sorted");
  assert(
    lines.every((line) => line.includes('"path":"public/z.myc.md"')),
    "path is not relative",
  );
});

Deno.test("projection verification tolerates order but rejects stale content", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-projection-" });
  try {
    const first = await makeDescriptor(
      "TestDescriptor",
      "test.v0.1",
      "b.myc.md",
      { n: 2 },
    );
    const second = await makeDescriptor(
      "TestDescriptor",
      "test.v0.1",
      "a.myc.md",
      { n: 1 },
    );
    await writeDescriptor(`${root}/public/b.myc.md`, first);
    await writeDescriptor(`${root}/public/a.myc.md`, second);
    await rebuildIndex(root);
    assert((await verifyProjections(root)).ok, "fresh projections must verify");

    const path = `${root}/public/index.ndjson`;
    const lines = (await Deno.readTextFile(path)).trim().split("\n");
    await Deno.writeTextFile(path, `${lines.reverse().join("\n")}\n`);
    assert(
      (await verifyProjections(root)).ok,
      "NDJSON order must be irrelevant",
    );
    assert(sameNdjsonLines("b\na\n", "a\nb\n"), "line comparison drifted");

    await Deno.writeTextFile(path, `${lines[0]}\n`);
    assert(!(await verifyProjections(root)).ok, "missing row must be stale");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
