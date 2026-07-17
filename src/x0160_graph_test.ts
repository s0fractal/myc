import {
  graphEdges as edgesFromFacade,
  rebuildGraph as rebuildFromFacade,
  verifyGraph as verifyFromFacade,
} from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import {
  graphEdgeRecord,
  graphEdges,
  rebuildGraph,
  transformationEdgesFor,
  verifyGraph,
} from "./x0160_graph.ts";

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

Deno.test("x0100 keeps graph engine exports as a compatibility façade", () => {
  assert(edgesFromFacade === graphEdges, "graphEdges binding drifted");
  assert(rebuildFromFacade === rebuildGraph, "rebuildGraph binding drifted");
  assert(verifyFromFacade === verifyGraph, "verifyGraph binding drifted");
});

Deno.test("graph edge projection redacts local paths by default", async () => {
  const descriptor = await makeDescriptor(
    "TransformationDescriptor",
    "transform.v0.1",
    "transform.myc.md",
    {
      step: "project",
      direction: "forward",
      proof_mode: "deterministic",
      function: { fqdn: "function.myc.md", commitment: "f" },
      input: { fqdn: "input.myc.md", commitment: "i" },
      output: { fqdn: "output.myc.md", commitment: "o" },
    },
  );
  const [edge] = transformationEdgesFor({ path: "/private/path", descriptor });
  assert(
    edge.transform_path === "/private/path",
    "internal provenance missing",
  );
  assert(!("transform_path" in graphEdgeRecord(edge, false)), "path leaked");
  assert(
    graphEdgeRecord(edge, true).transform_path === "/private/path",
    "explicit path missing",
  );
});

Deno.test("graph engine verifies a complete graph and rejects function drift", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-graph-" });
  try {
    const source = await makeDescriptor(
      "SourceDescriptor",
      "source.v0.1",
      "source.myc.md",
      { value: 1 },
    );
    const target = await makeDescriptor(
      "TargetDescriptor",
      "target.v0.1",
      "target.myc.md",
      { value: 2 },
    );
    const fn = await makeDescriptor(
      "FunctionDescriptor",
      "function.v0.1",
      "function.myc.md",
      { name: "test" },
    );
    const transform = await makeDescriptor(
      "TransformationDescriptor",
      "transform.v0.1",
      "transform.myc.md",
      {
        step: "project",
        direction: "forward",
        proof_mode: "deterministic",
        function: { fqdn: fn.fqdn, commitment: fn.commitment.value },
        input: { fqdn: source.fqdn, commitment: source.commitment.value },
        output: { fqdn: target.fqdn, commitment: target.commitment.value },
      },
    );
    for (const descriptor of [source, target, fn, transform]) {
      await writeDescriptor(`${root}/public/${descriptor.fqdn}`, descriptor);
    }
    await rebuildGraph(root);
    assert((await verifyGraph(root)).ok, "complete graph must verify");

    transform.body.function = { fqdn: fn.fqdn, commitment: "forged" };
    transform.commitment.value = (await makeDescriptor(
      transform.type,
      transform.schema_version,
      transform.fqdn,
      transform.body,
    )).commitment.value;
    await writeDescriptor(`${root}/public/${transform.fqdn}`, transform);
    await rebuildGraph(root);
    const verdict = await verifyGraph(root);
    assert(!verdict.ok, "function drift must fail closed");
    assert(
      verdict.errors.some((error) =>
        error.includes("function commitment mismatch")
      ),
      "drift error missing",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
