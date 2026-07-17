import * as facade from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import { type GraphEdge } from "./x0160_graph.ts";
import {
  explainTarget,
  lineageFor,
  resolveTargetRecord,
  summarizeDescriptor,
} from "./x0180_lineage.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function edge(transform: string): GraphEdge {
  return {
    transform,
    transform_path: `/private/${transform}.myc.md`,
    step: "project",
    direction: "forward",
    proof_mode: "deterministic",
    function_fqdn: null,
    function_commitment: null,
    input: { fqdn: "input.myc.md" },
    output: { fqdn: "output.myc.md" },
  };
}

Deno.test("x0100 facade preserves lineage engine bindings", () => {
  assert(facade.resolveTargetRecord === resolveTargetRecord, "resolve drift");
  assert(facade.lineageFor === lineageFor, "lineage drift");
  assert(facade.explainTarget === explainTarget, "explain drift");
});

Deno.test("lineage and explain fail closed for an unknown target", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-lineage-" });
  const target = "missing.example.myc.md";

  assert(await resolveTargetRecord(root, target) === null, "target resolved");

  const lineage = await lineageFor(root, target);
  assert(!lineage.ok, "missing lineage should fail");
  assert(lineage.errors[0] === "target-not-found", "wrong lineage error");
  assert(lineage.backward.length === 0, "unexpected backward edges");
  assert(lineage.forward.length === 0, "unexpected forward edges");

  const explanation = await explainTarget(root, target);
  assert(explanation.ok === false, "missing explanation should fail");
  assert(
    Array.isArray(explanation.errors) &&
      explanation.errors[0] === "target-not-found",
    "wrong explanation error",
  );
});

Deno.test("summary counts unique transformations and derives nutrition", async () => {
  const descriptor = await makeDescriptor(
    "ArtifactDescriptor",
    "0.1.0",
    "artifact.example.myc.md",
    {
      target: "artifact.example.myc.md",
      intent: "intent.example.myc.md",
      naming_proof: "proof.example.myc.md",
      proof_mode: "deterministic",
      payload_state: "private-local",
    },
  );

  const summary = summarizeDescriptor(descriptor, {
    backward: [edge("transform.a"), edge("transform.a")],
    forward: [edge("transform.b")],
  });

  assert(summary.incoming_edges === 2, "incoming edge count drift");
  assert(summary.incoming_transformations === 1, "deduplication drift");
  assert(summary.outgoing_transformations === 1, "forward count drift");
  assert(summary.payload_state === "private-local", "payload state drift");
  assert(
    typeof summary.nutrition === "object" && summary.nutrition !== null,
    "derived nutrition missing",
  );
});
