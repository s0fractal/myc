import {
  captureText,
  explainTarget,
  handleRequest,
  lineageFor,
  makeDescriptor,
  parseDescriptorFile,
  reprojectRaw,
  resolveFqdn,
  verifyGraph,
  verifyPath,
  verifyRawPayload,
} from "./myc.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("capture creates a resolvable deterministic descriptor chain", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "зроби маленький тест для myc",
    actor: "s0fractal",
    kind: "message",
  });

  assert(result.rawFqdn.startsWith("h."), "raw FQDN should be hash-first");
  assert(
    result.artifactFqdn.startsWith("task.s0fractal.h."),
    "task cue should produce task artifact FQDN",
  );

  const resolved = await resolveFqdn(root, result.artifactFqdn);
  assert(resolved, "artifact FQDN should resolve");
  assert(
    resolved.descriptor.type === "ArtifactDescriptor",
    "resolved descriptor should be an artifact",
  );

  const verified = await verifyPath(resolved.path);
  assert(verified.ok, verified.errors.join("\n"));
  const graph = await verifyGraph(root);
  assert(graph.ok, graph.errors.join("\n"));
  assert(graph.transformation_count === 4, "graph should see four transforms");
  assert(graph.edge_count >= 4, "graph should have generated edges");

  assert(
    result.transformationFqdns.length === 4,
    "capture should produce four transformation descriptors",
  );

  const lineage = await lineageFor(root, result.artifactFqdn);
  assert(lineage.ok, lineage.errors.join("\n"));
  assert(
    lineage.backward.some((edge) => edge.step === "classify"),
    "artifact lineage should include classification",
  );
  assert(
    lineage.backward.some((edge) => edge.step === "project"),
    "artifact lineage should include projection",
  );
});

Deno.test("raw descriptor can verify local private payload when available", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "просто думка без наказу",
    actor: "s0fractal",
    kind: "message",
  });

  const raw = await resolveFqdn(root, result.rawFqdn);
  assert(raw, "raw descriptor should resolve");
  const descriptor = await parseDescriptorFile(raw.path);
  const payload = await verifyRawPayload(root, descriptor);
  assert(payload.ok, payload.errors.join("\n"));
});

Deno.test("question input is classified separately from task input", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "як це буде працювати локально?",
    actor: "s0fractal",
    kind: "message",
  });

  assert(
    result.artifactFqdn.startsWith("question.s0fractal.h."),
    `unexpected artifact FQDN: ${result.artifactFqdn}`,
  );
});

Deno.test("read-only companion handler resolves and verifies descriptors", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "зроби http resolver demo",
    actor: "s0fractal",
    kind: "message",
  });

  const resolveResponse = await handleRequest(
    root,
    new Request(
      `http://127.0.0.1/resolve?fqdn=${
        encodeURIComponent(result.artifactFqdn)
      }`,
    ),
  );
  assert(resolveResponse.status === 200, "resolve should return 200");
  const resolved = await resolveResponse.json();
  assert(resolved.ok === true, "resolve JSON should be ok");
  assert(
    resolved.descriptor.type === "ArtifactDescriptor",
    "resolve should return artifact descriptor",
  );

  const verifyResponse = await handleRequest(
    root,
    new Request(
      `http://127.0.0.1/verify?target=${
        encodeURIComponent(result.artifactFqdn)
      }`,
    ),
  );
  assert(verifyResponse.status === 200, "verify should return 200");
  const verified = await verifyResponse.json();
  assert(verified.ok === true, "verify JSON should be ok");

  const lineageResponse = await handleRequest(
    root,
    new Request(
      `http://127.0.0.1/lineage?target=${
        encodeURIComponent(result.artifactFqdn)
      }`,
    ),
  );
  assert(lineageResponse.status === 200, "lineage should return 200");
  const lineage = await lineageResponse.json();
  assert(lineage.ok === true, "lineage JSON should be ok");
  assert(lineage.backward.length > 0, "lineage should include edges");

  const verifyGraphResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/verify-graph"),
  );
  assert(verifyGraphResponse.status === 200, "verify-graph should return 200");
  const graph = await verifyGraphResponse.json();
  assert(graph.ok === true, "verify-graph JSON should be ok");
});

Deno.test("explain summarizes transformation context", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "напиши explain layer",
    actor: "s0fractal",
    kind: "message",
  });

  const explanation = await explainTarget(root, result.artifactFqdn);
  assert(explanation.ok === true, "explain should be ok");
  const summary = explanation.summary as Record<string, unknown>;
  assert(
    summary.type === "ArtifactDescriptor",
    "summary should describe artifact",
  );
  assert(
    Number(summary.incoming_transformations) > 0,
    "summary should count incoming transformations",
  );
});

Deno.test("reproject reruns current lens as retrospective transformations", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const first = await captureText({
    root,
    text: "зроби retrospective projection",
    actor: "s0fractal",
    kind: "message",
  });

  const second = await reprojectRaw(root, first.rawFqdn);
  assert(
    second.rawHash === first.rawHash,
    "reprojection should preserve raw hash",
  );

  const lineage = await lineageFor(root, second.artifactFqdn);
  assert(lineage.ok, lineage.errors.join("\n"));
  assert(
    lineage.backward.some((edge) => edge.direction === "retrospective"),
    "lineage should include retrospective transformations",
  );
});

Deno.test("verifyGraph detects a bad function commitment", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "зроби graph verifier tamper test",
    actor: "s0fractal",
    kind: "message",
  });

  const transformPath = result.files.find((path) =>
    path.includes("transform.forward.classify")
  );
  assert(transformPath, "classify transform should be generated");

  const descriptor = await parseDescriptorFile(transformPath);
  const fn = descriptor.body.function as Record<string, unknown>;
  fn.commitment = "0".repeat(64);
  const patched = await makeDescriptor(
    descriptor.type,
    descriptor.schema_version,
    descriptor.fqdn,
    descriptor.body,
  );
  const original = await Deno.readTextFile(transformPath);
  const next = original.replace(
    /```json myc\n[\s\S]*?\n```/,
    `\`\`\`json myc\n${JSON.stringify(patched, null, 2)}\n\`\`\``,
  );
  await Deno.writeTextFile(transformPath, next);

  const graph = await verifyGraph(root);
  assert(!graph.ok, "tampered graph should fail verification");
  assert(
    graph.errors.some((error) =>
      error.includes("function commitment mismatch")
    ),
    graph.errors.join("\n"),
  );
});
