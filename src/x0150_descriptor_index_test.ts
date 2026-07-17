import {
  parseDescriptorFile as parseFromFacade,
  resolveFqdn as resolveFromFacade,
  scanDescriptors as scanFromFacade,
  verifyPath as verifyFromFacade,
} from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import {
  descriptorAddresses,
  descriptorNodeKeys,
  parseDescriptorFile,
  resolveFqdn,
  scanDescriptors,
  verifyPath,
} from "./x0150_descriptor_index.ts";

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

Deno.test("x0100 keeps descriptor index exports as a compatibility façade", () => {
  assert(parseFromFacade === parseDescriptorFile, "parse binding drifted");
  assert(resolveFromFacade === resolveFqdn, "resolve binding drifted");
  assert(scanFromFacade === scanDescriptors, "scan binding drifted");
  assert(verifyFromFacade === verifyPath, "verifyPath binding drifted");
});

Deno.test("descriptor index resolves canonical and immutable aliases", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-index-" });
  try {
    const descriptor = await makeDescriptor(
      "ArtifactDescriptor",
      "artifact.v0.1",
      "artifact.mutable.myc.md",
      {
        immutable_fqdn: "artifact.immutable.myc.md",
        artifact_hash: "artifact-hash",
        output: {
          fqdn: "artifact.output.myc.md",
          immutable_fqdn: "artifact.output.immutable.myc.md",
        },
      },
    );
    const path = `${root}/public/objects/artifact.myc.md`;
    await writeDescriptor(path, descriptor);
    const records = await scanDescriptors(root);
    assert(records.length === 1, "scan count drifted");
    assert(
      (await resolveFqdn(root, descriptor.fqdn))?.path === path,
      "canonical resolution failed",
    );
    assert(
      (await resolveFqdn(root, "artifact.immutable.myc.md"))?.path === path,
      "alias resolution failed",
    );
    assert((await verifyPath(path)).ok, "indexed descriptor must verify");
    const addresses = descriptorAddresses(descriptor);
    assert(addresses.length === 4, "address projection drifted");
    assert(
      descriptorNodeKeys(descriptor).includes("artifact-hash"),
      "node hash missing",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("descriptor scan excludes schemas and empty-content fossils", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-index-hygiene-" });
  try {
    const valid = await makeDescriptor(
      "TestDescriptor",
      "test.v0.1",
      "valid.myc.md",
      { ok: true },
    );
    const empty = await makeDescriptor(
      "TestDescriptor",
      "test.v0.1",
      "h.e3b0c44298fc.empty.myc.md",
      { ok: false },
    );
    await writeDescriptor(`${root}/public/valid.myc.md`, valid);
    await writeDescriptor(`${root}/public/ignored.schema.md`, valid);
    await writeDescriptor(`${root}/public/empty.myc.md`, empty);
    assert(
      (await scanDescriptors(root)).length === 1,
      "hygiene filters drifted",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
