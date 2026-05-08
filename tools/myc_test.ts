import {
  adapterDryRun,
  auditEntry,
  captureText,
  defaultRoot,
  explainAvailability,
  explainTarget,
  formatAuditEntry,
  handleRequest,
  lineageFor,
  makeDescriptor,
  nutritionForDescriptor,
  parseDescriptorFile,
  reprojectRaw,
  resolveFqdn,
  verificationReceipts,
  verifyGraph,
  verifyPath,
  verifyProjections,
  verifyRawPayload,
} from "./myc.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertStringField(
  value: Record<string, unknown>,
  key: string,
): void {
  assert(typeof value[key] === "string", `${key} should be a string`);
}

function assertBooleanField(
  value: Record<string, unknown>,
  key: string,
): void {
  assert(typeof value[key] === "boolean", `${key} should be a boolean`);
}

function assertStringArrayField(
  value: Record<string, unknown>,
  key: string,
): void {
  assert(Array.isArray(value[key]), `${key} should be an array`);
  assert(
    (value[key] as unknown[]).every((item) => typeof item === "string"),
    `${key} should contain only strings`,
  );
}

function assertOneOf(
  actual: unknown,
  allowed: string[],
  key: string,
): void {
  assert(
    typeof actual === "string" && allowed.includes(actual),
    `${key} has unexpected value '${String(actual)}'`,
  );
}

function assertAvailabilityResponseShape(value: Record<string, unknown>): void {
  assertBooleanField(value, "ok");
  assertStringField(value, "target");
  assertStringField(value, "payload_state");
  assertBooleanField(value, "payload_available_to_requester");
  assertBooleanField(value, "private_payload_present");
  assertStringField(value, "unavailable_reason");
  assertStringField(value, "access_mode");
  assertStringArrayField(value, "safe_next_steps");
  assertStringArrayField(value, "errors");
  assertOneOf(
    value.access_mode,
    [
      "descriptor-only",
      "local-private",
      "commitment-only",
      "capability-gated",
      "sealed-or-witnessed",
      "unknown",
      "none",
    ],
    "access_mode",
  );
}

function assertAdapterDryRunResponseShape(
  value: Record<string, unknown>,
): void {
  assertBooleanField(value, "ok");
  assertStringField(value, "adapter");
  assertStringField(value, "path");
  assertStringArrayField(value, "side_effects");
  assertStringArrayField(value, "verification");
  assertStringArrayField(value, "output_contract");
  assertBooleanField(value, "execution_enabled");
  assertStringArrayField(value, "errors");
  assert(
    value.execution_enabled === false,
    "adapter dry-run response must keep execution disabled",
  );
  for (
    const output of [
      "descriptor",
      "transform",
      "receipt",
      "proposal",
      "warning",
    ]
  ) {
    assert(
      (value.output_contract as string[]).includes(output),
      `output_contract should include ${output}`,
    );
  }
}

function assertRecipeDryRunResponseShape(
  value: Record<string, unknown>,
): void {
  assertBooleanField(value, "ok");
  assertStringField(value, "target");
  assertStringArrayField(value, "errors");
  if (value.ok) {
    assertStringField(value, "function_fqdn");
    assertStringField(value, "context_policy");
    assertStringField(value, "payload_policy");
    assertStringArrayField(value, "side_effects");
    assertStringField(value, "proof_mode");
    assertStringField(value, "output_contract");
  }
}

function assertProjectionVerificationResponseShape(
  value: Record<string, unknown>,
): void {
  assertBooleanField(value, "ok");
  assertStringField(value, "index_path");
  assertStringField(value, "graph_path");
  assertBooleanField(value, "index_synced");
  assertBooleanField(value, "graph_synced");
  assert(
    typeof value.descriptor_count === "number",
    "descriptor_count should be a number",
  );
  assert(
    typeof value.index_record_count === "number",
    "index_record_count should be a number",
  );
  assertStringArrayField(value, "errors");
  assertStringArrayField(value, "warnings");
}

function assertVerificationSourceResponseShape(
  value: Record<string, unknown>,
): void {
  assertBooleanField(value, "ok");
  assertStringField(value, "name");
  assertStringField(value, "source");
}

Deno.test("default root uses repository checkout when MYC_ROOT is unset", () => {
  const previous = Deno.env.get("MYC_ROOT");
  try {
    Deno.env.delete("MYC_ROOT");
    assert(
      defaultRoot() === Deno.cwd(),
      "default root should prefer current repository checkout",
    );
  } finally {
    if (previous === undefined) {
      Deno.env.delete("MYC_ROOT");
    } else {
      Deno.env.set("MYC_ROOT", previous);
    }
  }
});

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

Deno.test("adapter dry-run explains policy without enabling execution", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const path = `${root}/substrates/demo/MYC.md`;
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeTextFile(
    path,
    [
      "# Demo Adapter",
      "",
      "```yaml",
      "adapter_policy:",
      '  status: "draft"',
      '  read_policy: "explicit-roots"',
      '  write_policy: "proposal-only"',
      '  payload_policy: "descriptor-only"',
      '  side_effects: ["file-read"]',
      '  verification: ["deno-task-check"]',
      '  failure_mode: "warn-only"',
      "```",
    ].join("\n"),
  );

  const result = await adapterDryRun(root, "demo");
  assertAdapterDryRunResponseShape(
    result as unknown as Record<string, unknown>,
  );
  assert(result.ok, result.errors.join("\n"));
  assert(
    result.execution_enabled === false,
    "dry-run must not enable execution",
  );
  assert(
    result.output_contract.includes("proposal"),
    "dry-run should expose allowed output contract",
  );
  assert(
    result.write_policy === "proposal-only",
    "dry-run should parse write policy",
  );
});

Deno.test("availability explains private payload state without leaking path", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "локальний payload має лишитись приватним",
    actor: "s0fractal",
    kind: "message",
    storePayload: false,
  });

  const availability = await explainAvailability(root, result.rawFqdn);
  assertAvailabilityResponseShape(
    availability as unknown as Record<string, unknown>,
  );
  assert(availability.ok, availability.errors.join("\n"));
  assert(
    availability.payload_available_to_requester === false,
    "missing private payload should not be available",
  );
  assert(
    availability.unavailable_reason === "known-but-unavailable",
    `unexpected reason: ${availability.unavailable_reason}`,
  );
  assert(
    !JSON.stringify(availability).includes("/private/payloads/"),
    "availability response must not leak private payload path",
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

  const verifyProjectionResponse = await handleRequest(
    root,
    new Request("http://127.0.0.1/verify-projections"),
  );
  assert(
    verifyProjectionResponse.status === 200,
    "verify-projections should return 200",
  );
  const projections = await verifyProjectionResponse.json();
  assertProjectionVerificationResponseShape(projections);
  assert(projections.ok === true, "projection response should be ok");
  assert(projections.index_synced === true, "index should be synced");
  assert(projections.graph_synced === true, "graph should be synced");
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

Deno.test("verifyProjections detects stale public index", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await captureText({
    root,
    text: "зроби freshness check для index",
    actor: "s0fractal",
    kind: "message",
  });

  const clean = await verifyProjections(root);
  assertProjectionVerificationResponseShape(
    clean as unknown as Record<string, unknown>,
  );
  assert(clean.ok, clean.errors.join("\n"));
  assert(clean.index_synced, "index should start synced");
  assert(clean.graph_synced, "graph should start synced");

  await Deno.writeTextFile(`${root}/public/index.ndjson`, "{}\n");
  const stale = await verifyProjections(root);
  assertProjectionVerificationResponseShape(
    stale as unknown as Record<string, unknown>,
  );
  assert(!stale.ok, "stale index should fail projection verification");
  assert(!stale.index_synced, "index_synced should be false");
  assert(
    stale.errors.some((error) => error.includes("index.ndjson is stale")),
    stale.errors.join("\n"),
  );
});

Deno.test("verifyProjections is idempotent (running twice yields same index/graph)", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await captureText({
    root,
    text: "first projection",
    actor: "s0fractal",
    kind: "message",
  });

  // First run creates the index and graph
  const first = await verifyProjections(root);
  assert(first.ok, "first projection should succeed");
  const firstIndex = await Deno.readTextFile(`${root}/public/index.ndjson`);
  const firstGraph = await Deno.readTextFile(`${root}/public/graph.ndjson`);

  // Second run shouldn't change the outcome
  const second = await verifyProjections(root);
  assert(second.ok, "second projection should succeed");
  const secondIndex = await Deno.readTextFile(`${root}/public/index.ndjson`);
  const secondGraph = await Deno.readTextFile(`${root}/public/graph.ndjson`);

  assert(firstIndex === secondIndex, "index.ndjson must be idempotent");
  assert(firstGraph === secondGraph, "graph.ndjson must be idempotent");
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

Deno.test("availability endpoint explains capability boundary", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const result = await captureText({
    root,
    text: "payload буде тільки по capability",
    actor: "s0fractal",
    kind: "message",
    storePayload: false,
  });

  const response = await handleRequest(
    root,
    new Request(`http://local/availability?target=${result.rawFqdn}`),
  );
  const body = await response.json();
  assertAvailabilityResponseShape(body);
  assert(response.status === 200, `unexpected status ${response.status}`);
  assert(body.ok === true, "availability endpoint should resolve target");
  assert(
    body.access_mode === "commitment-only",
    `unexpected access mode ${body.access_mode}`,
  );
});

Deno.test("adapter dry-run endpoint is read-only and non-executing", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  const path = `${root}/substrates/demo/MYC.md`;
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeTextFile(
    path,
    [
      "# Demo Adapter",
      "",
      "```yaml",
      "adapter_policy:",
      '  status: "draft"',
      '  read_policy: "explicit-roots"',
      '  write_policy: "proposal-only"',
      '  payload_policy: "descriptor-only"',
      '  side_effects: ["file-read"]',
      '  verification: ["deno-task-check"]',
      '  failure_mode: "warn-only"',
      "```",
    ].join("\n"),
  );

  const response = await handleRequest(
    root,
    new Request("http://local/adapter-dry-run?adapter=demo"),
  );
  const body = await response.json();
  assertAdapterDryRunResponseShape(body);
  assert(response.status === 200, `unexpected status ${response.status}`);
  assert(body.ok === true, "adapter endpoint should parse policy");
  assert(body.execution_enabled === false, "adapter endpoint must not execute");
});

Deno.test("verification endpoint lists public receipts only", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await Deno.mkdir(`${root}/public/verification`, { recursive: true });
  await Deno.writeTextFile(
    `${root}/public/verification/audit-one.md`,
    "# Audit One\n",
  );
  await Deno.writeTextFile(
    `${root}/public/verification/audit-two.md`,
    "# Audit Two\n",
  );

  const receipts = await verificationReceipts(root);
  assert(receipts.length === 2, "two receipts should be listed");
  assert(
    receipts.every((receipt) =>
      receipt.path.startsWith("public/verification/")
    ),
    "receipt paths should be public and relative",
  );

  const response = await handleRequest(
    root,
    new Request("http://local/verification"),
  );
  const body = await response.json();
  assert(response.status === 200, `unexpected status ${response.status}`);
  assert(body.ok === true, "verification endpoint should be ok");
  assert(body.count === 2, "verification endpoint should return count");
  assert(
    !JSON.stringify(body).includes(`${root}`),
    "verification endpoint must not leak local root",
  );

  const sourceResponse = await handleRequest(
    root,
    new Request("http://local/verification-source?name=audit-one.md"),
  );
  const sourceBody = await sourceResponse.json();
  assertVerificationSourceResponseShape(sourceBody);
  assert(sourceResponse.status === 200, "receipt source should return 200");
  assert(sourceBody.source === "# Audit One\n", "receipt source should match");

  const traversalResponse = await handleRequest(
    root,
    new Request("http://local/verification-source?name=../README.md"),
  );
  const traversalBody = await traversalResponse.json();
  assert(traversalResponse.status === 400, "path traversal should fail");
  assert(
    traversalBody.error === "invalid-name",
    "path traversal should return invalid-name",
  );
});

Deno.test("recipe dry-run endpoint inspects RecipeDescriptor policy", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });
  await Deno.mkdir(`${root}/public/functions`, { recursive: true });
  await Deno.mkdir(`${root}/public/objects/h/test`, { recursive: true });

  await makeDescriptor(
    "FunctionDescriptor",
    "myc.function.v0.1",
    "h.testfunc.function.myc.md",
    { name: "testfunc" },
  );

  const recipeDescriptor = await makeDescriptor(
    "RecipeDescriptor",
    "myc.recipe.v0.1",
    "h.testrecipe.recipe.myc.md",
    {
      recipe: {
        function: "h.testfunc.function.myc.md",
        context_policy: "public",
        payload_policy: "none",
        side_effects: ["none"],
        proof_mode: "deterministic",
        output_contract: "descriptor",
        dry_run: true,
      },
    },
  );

  await Deno.writeTextFile(
    `${root}/public/objects/h/test/recipe.myc.md`,
    `---\nchord:\n  primary: "oct:7.2"\n---\n\`\`\`json myc\n${
      JSON.stringify(recipeDescriptor, null, 2)
    }\n\`\`\`\n`,
  );

  const response = await handleRequest(
    root,
    new Request(
      "http://local/recipe-dry-run?target=h.testrecipe.recipe.myc.md",
    ),
  );
  const body = await response.json();

  assert(response.status === 200, `expected 200, got ${response.status}`);
  assertRecipeDryRunResponseShape(body);
  assert(body.ok === true, "recipe dry-run should be ok");
  assert(
    body.function_fqdn === "h.testfunc.function.myc.md",
    "should report correct function",
  );
  assert(
    body.payload_policy === "none",
    "should report correct payload policy",
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

Deno.test("myc publish creates an export bundle without local paths", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });

  // 1. Capture text to generate a full graph
  const { captureText } = await import("./myc.ts");
  await captureText({
    root,
    text: "Test publish payload",
    actor: "s0fractal",
    kind: "message",
    storePayload: true,
  });

  // 2. Resolve the generated intent
  const indexStr = await Deno.readTextFile(root + "/public/index.ndjson");
  const intents = indexStr.split("\n").filter((l: string) =>
    l.includes("IntentDescriptor")
  );
  assert(intents.length > 0, "should have generated an intent");
  const intentFqdn = JSON.parse(intents[0]).fqdn;

  // 3. Publish
  const { publishTarget } = await import("./myc.ts");
  const result = await publishTarget(root, intentFqdn);

  assert(result.ok, "publish should succeed: " + result.errors.join(", "));
  assert(result.path, "should return export path");

  // 4. Verify export bundle
  const bundleStr = await Deno.readTextFile(result.path!);
  const descriptors = bundleStr.split("\n").filter(Boolean).map((l: string) =>
    JSON.parse(l)
  );

  // Ensure PublishDescriptor is included
  const hasPublish = descriptors.some((d: Record<string, unknown>) =>
    d.type === "PublishDescriptor"
  );
  assert(hasPublish, "bundle should contain PublishDescriptor");

  // Ensure no local paths
  for (const d of descriptors) {
    if (d.type === "IntentDescriptor") {
      assert(
        d.body.address.local_path === null,
        "local_path must be scrubbed in exports",
      );
    }
    if (d.body.payload_policy === "private") {
      assert(!d.body.payload, "private payload must be scrubbed");
    }
  }
});

Deno.test("myc import merges valid external bundle into local graph", async () => {
  const rootA = await Deno.makeTempDir({ prefix: "myc-test-a-" });
  const rootB = await Deno.makeTempDir({ prefix: "myc-test-b-" });

  // 1. Capture text in A
  const { captureText, publishTarget, importGraph, resolveTargetRecord } =
    await import("./myc.ts");
  await captureText({
    root: rootA,
    text: "Import payload",
    actor: "s0fractal",
    kind: "message",
    storePayload: true,
  });

  // 2. Resolve intent in A
  const indexStr = await Deno.readTextFile(rootA + "/public/index.ndjson");
  const intents = indexStr.split("\n").filter((l: string) =>
    l.includes("IntentDescriptor")
  );
  const intentFqdn = JSON.parse(intents[0]).fqdn;

  // 3. Publish in A
  const publishResult = await publishTarget(rootA, intentFqdn);
  assert(publishResult.ok, "publish should succeed");
  const exportPath = publishResult.path!;

  // 4. Import into B
  const importResult = await importGraph(rootB, exportPath);
  assert(
    importResult.ok,
    "import should succeed: " + importResult.errors.join(", "),
  );
  assert(importResult.imported > 0, "should have imported descriptors");

  // 5. Verify B can resolve the intent FQDN
  const record = await resolveTargetRecord(rootB, intentFqdn);
  assert(record !== null, "B should be able to resolve imported FQDN");
  assert(
    record.descriptor.type === "IntentDescriptor",
    "should be IntentDescriptor",
  );
});

Deno.test("myc witness and review generate valid consensus descriptors", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-test-" });

  // 1. Capture text
  const {
    captureText,
    publishTarget,
    importGraph,
    witnessTarget,
    reviewTarget,
    resolveFqdn,
  } = await import("./myc.ts");
  await captureText({
    root,
    text: "Consensus target payload",
    actor: "s0fractal",
    kind: "message",
    storePayload: true,
  });

  // 2. Resolve intent
  const indexStr = await Deno.readTextFile(root + "/public/index.ndjson");
  const intents = indexStr.split("\n").filter((l: string) =>
    l.includes("IntentDescriptor")
  );
  const intentFqdn = JSON.parse(intents[0]).fqdn;

  // 3. Publish and Import (to persist PublishDescriptor locally)
  const publishResult = await publishTarget(root, intentFqdn);
  assert(publishResult.ok, "publish should succeed");
  const publishFqdn = publishResult.fqdn;

  const importResult = await importGraph(root, publishResult.path!);
  assert(
    importResult.ok,
    "import should succeed: " + importResult.errors.join(", "),
  );

  // 4. Witness the PublishDescriptor
  const witnessResult = await witnessTarget(root, publishFqdn, "s0fractal");
  assert(
    witnessResult.ok,
    "witness should succeed: " + witnessResult.errors.join(", "),
  );
  assert(witnessResult.fqdn, "witness should return fqdn");

  // 5. Review the IntentDescriptor
  const reviewResult = await reviewTarget(
    root,
    intentFqdn,
    "s0fractal",
    "approve",
    "Looks good",
  );
  assert(
    reviewResult.ok,
    "review should succeed: " + reviewResult.errors.join(", "),
  );
  assert(reviewResult.fqdn, "review should return fqdn");

  // 6. Verify they are resolvable
  const witnessRecord = await resolveFqdn(root, witnessResult.fqdn!);
  assert(witnessRecord !== null, "Witness descriptor should resolve");
  assert(
    witnessRecord!.descriptor.type === "WitnessDescriptor",
    "Type must be WitnessDescriptor",
  );

  const reviewRecord = await resolveFqdn(root, reviewResult.fqdn!);
  assert(reviewRecord !== null, "Review descriptor should resolve");
  assert(
    reviewRecord!.descriptor.type === "ReviewDescriptor",
    "Type must be ReviewDescriptor",
  );

  // 7. Verify witness rejects non-Publish targets
  const badWitness = await witnessTarget(root, intentFqdn, "s0fractal");
  assert(!badWitness.ok, "witness should reject IntentDescriptor");

  // 8. Verify review rejects invalid ratings
  const badReview = await reviewTarget(root, intentFqdn, "s0fractal", "maybe");
  assert(!badReview.ok, "review should reject invalid rating");
});
