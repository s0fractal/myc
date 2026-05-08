import { auditRoot } from "./protocol_audit.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function write(path: string, text: string): Promise<void> {
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeTextFile(path, text);
}

Deno.test("protocol audit rejects premature public capability descriptors", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/capabilities/capability.h.bad.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "CapabilityDescriptor",
          schema_version: "myc.capability.v0.1",
          fqdn: "capability.h.bad.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {},
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "capability descriptor should fail audit");
  assert(
    result.errors.some((error) => error.includes("CapabilityDescriptor")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects leaked public payload markers", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/objects/h/bad/raw.md`,
    '{"contains_payload": true, "path": "private/payloads/bad.txt"}',
  );

  const result = await auditRoot(root);
  assert(!result.ok, "payload marker should fail audit");
  assert(
    result.errors.some((error) => error.includes("private payload")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects nutrition inside function identity body", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/functions/h.bad.function.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "FunctionDescriptor",
          schema_version: "myc.function.v0.1",
          fqdn: "h.bad.function.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {
            name: "bad",
            nutrition: { status: "verified" },
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "function-body nutrition should fail audit");
  assert(
    result.errors.some((error) => error.includes("must not include nutrition")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects invalid RecipeDescriptor", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/objects/h/bad/recipe.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "RecipeDescriptor",
          schema_version: "myc.recipe.v0.1",
          fqdn: "h.bad.recipe.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {
            recipe: {
              function: "h.somefunc.function.myc.md",
              // Missing context_policy, payload_policy, etc.
            },
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "invalid recipe descriptor should fail audit");
  assert(
    result.errors.some((error) =>
      error.includes("must declare 'context_policy'")
    ),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects invalid CapabilityDescriptor", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/objects/h/bad/capability.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "CapabilityDescriptor",
          schema_version: "myc.capability.v0.1",
          fqdn: "h.bad.capability.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {
            capability_contract: {
              subject: "h.some",
              // Missing requester, operation, etc.
            },
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "invalid capability descriptor should fail audit");
  assert(
    result.errors.some((error) => error.includes("must declare 'requester'")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects invalid SealedReceiptDescriptor", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/objects/h/bad/sealed.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "SealedReceiptDescriptor",
          schema_version: "myc.sealed.v0.1",
          fqdn: "h.bad.sealed.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {
            sealed_receipt_contract: {
              subject: "h.some",
              // Missing claim, verifier, etc.
            },
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "invalid sealed receipt descriptor should fail audit");
  assert(
    result.errors.some((error) => error.includes("must declare 'claim'")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects invalid IntentDescriptor", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/objects/h/bad/intent.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "IntentDescriptor",
          schema_version: "myc.intent.v0.1",
          fqdn: "h.bad.intent.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {
            intent: {
              id: "h.some.intent.myc.md",
              // Missing raw, actor, kind, etc.
            },
            address: {
              fqdn: "some.address",
            },
            context_chain: {},
            materialization: {},
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "invalid intent descriptor should fail audit");
  assert(
    result.errors.some((error) => error.includes("must declare 'raw'")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects invalid PublishDescriptor", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/public/objects/h/bad/publish.myc.md`,
    [
      "```json myc",
      JSON.stringify(
        {
          type: "PublishDescriptor",
          schema_version: "myc.publish.v0.1",
          fqdn: "h.bad.publish.myc.md",
          commitment: {
            algorithm: "sha256",
            value: "0".repeat(64),
            covers: "descriptor.body",
          },
          body: {
            publish_clearance: {
              target_fqdn: "h.some.artifact.myc.md",
              target_commitment: "hash",
              export_scope: "invalid_scope",
            },
            publication_gates: {
              naming_proof_verified: true,
            },
            destinations: [],
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "invalid publish descriptor should fail audit");
  assert(
    result.errors.some((error) =>
      error.includes("must be 'single', 'closure', or 'subgraph'")
    ),
    result.errors.join("\n"),
  );
  assert(
    result.errors.some((error) =>
      error.includes("must declare 'graph_verified'")
    ),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects substrate adapters without policy", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/substrates/demo/MYC.md`,
    [
      "# Demo Adapter Draft",
      "",
      "```yaml",
      "substrate:",
      '  name: "demo"',
      '  role: "example"',
      "```",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "substrate without policy should fail audit");
  assert(
    result.errors.some((error) => error.includes("adapter policy")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects recipe drafts without dry-run contract", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/protocols/recipes/examples/bad.recipe.yaml`,
    [
      "recipe:",
      '  function: "h.bad.function.myc.md"',
      '  payload_policy: "descriptor-only"',
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "recipe without dry-run contract should fail audit");
  assert(
    result.errors.some((error) => error.includes("recipe draft")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects capability drafts without authority contract", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/protocols/capabilities/examples/bad.capability.yaml`,
    [
      "capability_contract:",
      '  subject: "h.bad"',
      '  operation: "read"',
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "capability without authority contract should fail audit");
  assert(
    result.errors.some((error) => error.includes("capability draft")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects sealed drafts without receipt contract", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/protocols/sealed/examples/bad.sealed.yaml`,
    [
      "sealed_receipt_contract:",
      '  subject: "h.bad"',
      '  claim: "verified"',
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "sealed receipt without contract should fail audit");
  assert(
    result.errors.some((error) => error.includes("sealed draft")),
    result.errors.join("\n"),
  );
});

Deno.test("protocol audit rejects invalid imported receipts", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-audit-test-" });
  await write(
    `${root}/substrates/liquid/receipts/receipt.h.bad.myc.md`,
    [
      "---",
      'type: "OtherDescriptor"',
      "---",
    ].join("\n"),
  );

  const result = await auditRoot(root);
  assert(!result.ok, "invalid imported receipt should fail audit");
  assert(
    result.errors.some((error) =>
      error.includes("must be a SealedReceiptDescriptor")
    ),
    result.errors.join("\n"),
  );
  assert(
    result.errors.some((error) =>
      error.includes("missing required key 'intent_hash:'")
    ),
    result.errors.join("\n"),
  );
});
