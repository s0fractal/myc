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
