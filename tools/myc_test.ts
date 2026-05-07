import {
  auditEntry,
  captureText,
  explainTarget,
  formatAuditEntry,
  handleRequest,
  lineageFor,
  makeDescriptor,
  nutritionForDescriptor,
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

Deno.test("health and index do not expose local paths by default", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await captureText({
    root,
    text: "зроби local path boundary test",
    actor: "s0fractal",
    kind: "message",
  });

  const healthResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/health"),
  );
  assert(healthResponse.status === 200, "health should return 200");
  const health = await healthResponse.json();
  assert(health.ok === true, "health should be ok");
  assert(health.version === "0.1.0", "health should include version");
  assert(!("root" in health), "health should not expose root path");
  assert(
    health.root_state === "local-private",
    "health should describe root privacy state",
  );

  const indexResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/index"),
  );
  assert(indexResponse.status === 200, "index should return 200");
  const index = await indexResponse.json();
  assert(index.records.length > 0, "index should include records");
  assert(!("path" in index.records[0]), "index should omit paths by default");

  const pathIndexResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/index?paths=1"),
  );
  assert(pathIndexResponse.status === 200, "path index should return 200");
  const pathIndex = await pathIndexResponse.json();
  assert(
    typeof pathIndex.records[0].path === "string",
    "index paths should be explicit opt-in",
  );
});

Deno.test("graph endpoint returns sanitized edges by default", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await captureText({
    root,
    text: "зроби sanitized graph endpoint",
    actor: "s0fractal",
    kind: "message",
  });

  const graphResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/graph"),
  );
  assert(graphResponse.status === 200, "graph should return 200");
  const graph = await graphResponse.json();
  assert(graph.ok === true, "graph response should be ok");
  assert(graph.count > 0, "graph should include edges");
  assert(
    !("transform_path" in graph.edges[0]),
    "graph should omit local transform paths by default",
  );

  const pathGraphResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/graph?paths=1"),
  );
  assert(pathGraphResponse.status === 200, "path graph should return 200");
  const pathGraph = await pathGraphResponse.json();
  assert(
    typeof pathGraph.edges[0].transform_path === "string",
    "graph paths should be explicit opt-in",
  );
});

Deno.test("derived nutrition does not change descriptor identity", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "просто нейтральна думка",
    actor: "s0fractal",
    kind: "message",
  });

  const artifact = await resolveFqdn(root, result.artifactFqdn);
  assert(artifact, "artifact should resolve");
  const before = artifact.descriptor.commitment.value;
  const nutrition = nutritionForDescriptor(artifact.descriptor);
  const verified = await verifyPath(artifact.path);

  assert(verified.ok, verified.errors.join("\n"));
  assert(
    artifact.descriptor.commitment.value === before,
    "nutrition should be derived and not mutate descriptor commitment",
  );
  assert(
    nutrition.status === "speculative",
    `expected speculative nutrition, got ${nutrition.status}`,
  );
  assert(
    nutrition.labels.includes("speculative"),
    "nutrition labels should include status",
  );
});

Deno.test("nutrition endpoint and graph warnings expose speculative state", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "нейтральний запис без явного наміру",
    actor: "s0fractal",
    kind: "message",
  });

  const response = await handleRequest(
    root,
    new Request(`http://localhost/nutrition?target=${result.artifactFqdn}`),
  );
  assert(response.status === 200, "nutrition endpoint should return 200");
  const body = await response.json();
  assert(body.ok === true, "nutrition response should be ok");
  assert(
    body.nutrition.status === "speculative",
    "neutral artifact should be speculative",
  );

  const graph = await verifyGraph(root);
  assert(graph.ok, graph.errors.join("\n"));
  assert(
    graph.warnings.some((warning) => warning.includes("speculative")),
    "graph verifier should warn about speculative descriptors",
  );
  assert(
    graph.nutrition_counts.speculative > 0,
    "graph verifier should count speculative descriptors",
  );
});

Deno.test("expired embedded nutrition is reported as stale", async () => {
  const descriptor = await makeDescriptor(
    "ArtifactDescriptor",
    "myc.artifact.v0.1",
    "artifact.example.h.deadbeef.myc.md",
    {
      artifact_hash: "deadbeef",
      formula: {
        input: {
          function_hash: "f",
          input_commitment: "i",
          context_commitment: "c",
          params_commitment: "p",
        },
      },
      classification: { confidence: "medium" },
      nutrition: {
        expires_at: "2026-01-01T00:00:00.000Z",
      },
    },
  );

  const nutrition = nutritionForDescriptor(
    descriptor,
    new Date("2026-05-07T00:00:00.000Z"),
  );
  assert(nutrition.status === "stale", "expired nutrition should be stale");
  assert(nutrition.freshness === "stale", "freshness should be stale");
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

Deno.test("function descriptors produce stable identity hashes", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await captureText({
    root,
    text: "dummy",
    actor: "s0fractal",
    kind: "message",
  });

  const functionsDir = `${root}/public/functions`;
  const fns = [];
  for await (const dirEntry of Deno.readDir(functionsDir)) {
    if (dirEntry.isFile && dirEntry.name.endsWith(".myc.md")) {
      fns.push(dirEntry.name);
    }
  }

  assert(fns.length === 3, "should generate exactly 3 core functions");

  const canonicalizer = fns.find((f) => f.includes(".myc-raw-bytes-sha256."));
  assert(canonicalizer, "canonicalizer function should exist");
  assert(
    canonicalizer.includes("h.4f76fd8466bc"),
    `expected stable canonicalizer hash h.4f76fd8466bc, got ${canonicalizer}`,
  );

  const classifier = fns.find((f) =>
    f.includes(".myc-intent-rules-classifier.")
  );
  assert(classifier, "classifier function should exist");
  assert(
    classifier.includes("h.340cb8baf52e"),
    `expected stable classifier hash h.340cb8baf52e, got ${classifier}`,
  );

  const namingPolicy = fns.find((f) => f.includes(".myc-fqdn-naming-policy."));
  assert(namingPolicy, "naming policy function should exist");
  assert(
    namingPolicy.includes("h.849874aa8a18"),
    `expected stable naming policy hash h.849874aa8a18, got ${namingPolicy}`,
  );
});

Deno.test("resolver endpoints serve correct responses", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "test message for endpoints",
    actor: "s0fractal",
    kind: "message",
  });

  const reqDesc = new Request(
    `http://localhost/descriptor?target=${result.artifactFqdn}`,
  );
  const resDesc = await handleRequest(root, reqDesc);
  assert(resDesc.status === 200, "descriptor endpoint should return 200");
  const descJson = await resDesc.json();
  assert(descJson.ok === true, "descriptor ok");
  assert(
    descJson.descriptor.fqdn === result.artifactFqdn,
    "descriptor fqdn match",
  );

  const reqSource = new Request(
    `http://localhost/source?target=${result.artifactFqdn}`,
  );
  const resSource = await handleRequest(root, reqSource);
  assert(
    resSource.status === 200,
    "source endpoint should return 200 for public descriptor",
  );
  const sourceJson = await resSource.json();
  assert(sourceJson.ok === true, "source ok");
  assert(typeof sourceJson.source === "string", "source is string");

  const reqSummary = new Request(
    `http://localhost/summary?target=${result.artifactFqdn}`,
  );
  const resSummary = await handleRequest(root, reqSummary);
  assert(resSummary.status === 200, "summary endpoint should return 200");
  const summaryJson = await resSummary.json();
  assert(summaryJson.ok === true, "summary ok");
  assert(
    summaryJson.summary.incoming_transformations > 0,
    "summary should include lineage-derived counts",
  );
  assert(
    typeof summaryJson.summary.nutrition.status === "string",
    "summary should include derived nutrition",
  );

  const reqVersion = new Request(`http://localhost/version`);
  const resVersion = await handleRequest(root, reqVersion);
  assert(resVersion.status === 200, "version endpoint should return 200");

  const reqSearch = new Request(`http://localhost/search?q=s0fractal`);
  const resSearch = await handleRequest(root, reqSearch);
  assert(resSearch.status === 200, "search endpoint should return 200");
  const searchJson = await resSearch.json();
  assert(searchJson.ok === true, "search ok");
  assert(searchJson.count > 0, "search should return matches");
  assert(
    typeof searchJson.results[0].fqdn === "string",
    "search should return structured records",
  );
});

Deno.test("resolver errors and CORS are stable", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });

  const missing = await handleRequest(
    root,
    new Request("http://localhost/descriptor"),
  );
  assert(missing.status === 400, "missing target should return 400");
  const missingBody = await missing.json();
  assert(missingBody.ok === false, "error body should be negative");
  assert(
    missingBody.error === "missing-target",
    "error code should be stable",
  );
  assert(
    typeof missingBody.message === "string",
    "error message should be present",
  );

  const method = await handleRequest(
    root,
    new Request("http://localhost/version", { method: "POST" }),
  );
  assert(method.status === 405, "unsupported methods should return 405");
  const methodBody = await method.json();
  assert(
    methodBody.error === "method-not-allowed",
    "method error code should be stable",
  );

  const allowed = await handleRequest(
    root,
    new Request("http://localhost/version", {
      headers: { origin: "https://myc.md" },
    }),
  );
  assert(
    allowed.headers.get("access-control-allow-origin") === "https://myc.md",
    "myc.md should be allowed",
  );

  const blocked = await handleRequest(
    root,
    new Request("http://localhost/version", {
      headers: { origin: "https://example.com" },
    }),
  );
  assert(
    blocked.headers.get("access-control-allow-origin") === "null",
    "unknown origins should not be reflected",
  );
});

Deno.test("source endpoint serves descriptor source, not private payload", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const secretText = "секретний локальний payload";
  const result = await captureText({
    root,
    text: secretText,
    actor: "s0fractal",
    kind: "message",
  });

  const response = await handleRequest(
    root,
    new Request(`http://localhost/source?target=${result.rawFqdn}`),
  );
  assert(response.status === 200, "source should return raw descriptor source");
  const body = await response.json();
  assert(
    typeof body.source === "string",
    "source response should include markdown source",
  );
  assert(
    body.source.includes("RawDescriptor"),
    "source should contain descriptor markdown",
  );
  assert(
    !body.source.includes(secretText),
    "source must not include private payload bytes",
  );
});

Deno.test("audit entries include path but not query payload", () => {
  const request = new Request(
    "http://127.0.0.1:8787/descriptor?target=secret.raw.myc.md",
  );
  const response = new Response("{}", { status: 200 });
  const entry = auditEntry(
    request,
    response,
    12.4,
    new Date("2026-05-07T12:00:00.000Z"),
  );
  const line = formatAuditEntry(entry);

  assert(entry.path === "/descriptor", "audit path should omit query string");
  assert(!line.includes("secret.raw"), "audit line must not include query");
  assert(
    line === "[audit] 2026-05-07T12:00:00.000Z | GET /descriptor 200 12ms",
    `unexpected audit line: ${line}`,
  );
});
