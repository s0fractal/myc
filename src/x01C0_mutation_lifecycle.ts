// Publication exchange and consensus mutations. This module owns the explicit
// write boundary for publish/import/witness/review operations.

import { type Json, sha256Hex, stableStringify } from "./verify_core.ts";
import { type MycDescriptor } from "./x0110_descriptor_core.ts";
import { verifyDescriptor } from "./x0120_descriptor_verify.ts";
import { joinPath } from "./x0140_paths.ts";
import { resolveFqdn } from "./x0150_descriptor_index.ts";
import { rebuildIndex, verifyProjections } from "./x0170_projections.ts";
import { lineageFor, resolveTargetRecord } from "./x0180_lineage.ts";
import { writeDescriptorFile } from "./x01B0_descriptor_store.ts";

export interface MutationResult {
  ok: boolean;
  fqdn?: string;
  path?: string;
  errors: string[];
}

export interface ImportGraphResult {
  ok: boolean;
  imported: number;
  errors: string[];
}

export async function publishTarget(
  root: string,
  target: string,
  derivedFrom?: string,
): Promise<MutationResult & { fqdn: string }> {
  const record = await resolveTargetRecord(root, target);
  if (!record) return { ok: false, fqdn: target, errors: ["target-not-found"] };

  const graphVerified = await verifyProjections(root);
  if (!graphVerified.ok) {
    return {
      ok: false,
      fqdn: target,
      errors: ["graph-verification-failed", ...graphVerified.errors],
    };
  }

  const lineage = await lineageFor(root, target);
  const descriptorsToPublish = new Map<string, MycDescriptor>();

  async function addDescriptor(fqdn: string) {
    if (!fqdn || descriptorsToPublish.has(fqdn)) return;
    const resolved = await resolveTargetRecord(root, fqdn);
    if (!resolved) return;
    const clone = JSON.parse(JSON.stringify(resolved.descriptor));
    if (clone.body.payload_policy === "private" && clone.body.payload) {
      delete clone.body.payload;
    }
    if (clone.type === "IntentDescriptor") {
      if (clone.body.address && clone.body.address.local_path) {
        clone.body.address.local_path = null;
      }
    }
    descriptorsToPublish.set(fqdn, clone);
  }

  await addDescriptor(record.descriptor.fqdn);
  for (const edge of lineage.backward) {
    if (edge.transform) await addDescriptor(edge.transform);
    if (edge.function_fqdn) await addDescriptor(edge.function_fqdn);
    if (edge.input && typeof edge.input === "object" && "fqdn" in edge.input) {
      await addDescriptor(edge.input.fqdn as string);
    }
  }

  const targetHashMatch = record.descriptor.fqdn.match(
    /(?:^|\.)h\.([0-9a-f]+)\./,
  );
  const targetHash = targetHashMatch ? targetHashMatch[1] : "unknown";
  const publishFqdn = `h.${targetHash}.publish.myc.md`;
  const publishDescriptor: MycDescriptor = {
    type: "PublishDescriptor",
    schema_version: "myc.publish.v0.1",
    fqdn: publishFqdn,
    commitment: {
      algorithm: "sha256",
      value: "",
      covers: "descriptor.body",
    },
    body: {
      publish_clearance: {
        target_fqdn: record.descriptor.fqdn,
        target_commitment: record.descriptor.commitment.value,
        export_scope: "closure",
      },
      publication_gates: {
        naming_proof_verified: true,
        graph_verified: true,
        payload_scrubbed: true,
      },
      destinations: [],
      ...(derivedFrom ? { derived_from: derivedFrom } : {}),
    },
  };
  publishDescriptor.commitment.value = await sha256Hex(
    stableStringify(publishDescriptor.body as unknown as Json),
  );
  descriptorsToPublish.set(publishFqdn, publishDescriptor);

  const exportLines = Array.from(descriptorsToPublish.values()).map((item) =>
    stableStringify(item as unknown as Json)
  );
  await Deno.mkdir(joinPath(root, "public", "exports"), { recursive: true });
  const exportPath = joinPath(
    root,
    "public",
    "exports",
    `${record.descriptor.fqdn}.export.ndjson`,
  );
  await Deno.writeTextFile(exportPath, exportLines.join("\n") + "\n");

  const publishWritePath = joinPath(
    root,
    "public",
    "consensus",
    "publish",
    "h",
    targetHash,
    publishFqdn,
  );
  await writeDescriptorFile(
    publishWritePath,
    publishDescriptor,
    "Publish Descriptor",
    "Publication clearance for the target closure; witnessable consensus node.",
  );
  await rebuildIndex(root);
  return { ok: true, fqdn: publishFqdn, path: exportPath, errors: [] };
}

export async function importGraph(
  root: string,
  path: string,
): Promise<ImportGraphResult> {
  let content: string;
  try {
    content = await Deno.readTextFile(path);
  } catch (error) {
    return {
      ok: false,
      imported: 0,
      errors: [`failed to read file: ${error}`],
    };
  }

  const descriptors: MycDescriptor[] = [];
  for (const line of content.split("\n").filter(Boolean)) {
    try {
      descriptors.push(JSON.parse(line));
    } catch (error) {
      return {
        ok: false,
        imported: 0,
        errors: [`failed to parse json line: ${error}`],
      };
    }
  }

  const errors: string[] = [];
  let imported = 0;
  for (const descriptor of descriptors) {
    const expected = await sha256Hex(stableStringify(descriptor.body));
    if (descriptor.commitment.value !== expected) {
      errors.push(
        `invalid commitment for ${descriptor.fqdn}: expected ${expected}, got ${descriptor.commitment.value}`,
      );
      continue;
    }

    let targetDir = "objects";
    if (descriptor.type === "FunctionDescriptor") targetDir = "functions";
    if (descriptor.type === "TransformationDescriptor") {
      targetDir = "transforms";
    }
    if (descriptor.type === "WitnessDescriptor") {
      targetDir = "consensus/witness";
    }
    if (descriptor.type === "ReviewDescriptor") targetDir = "consensus/review";

    const match = descriptor.fqdn.match(/(?:^|\.)h\.([0-9a-f]+)\./);
    if (!match) {
      errors.push(`invalid fqdn format: ${descriptor.fqdn}`);
      continue;
    }
    const writePath = descriptor.type === "FunctionDescriptor"
      ? joinPath(root, "public", targetDir, descriptor.fqdn)
      : joinPath(root, "public", targetDir, "h", match[1], descriptor.fqdn);
    if (!(await exists(writePath))) {
      await writeDescriptorFile(
        writePath,
        descriptor,
        `Imported ${descriptor.type}`,
        "Imported from external graph bundle.",
      );
      imported++;
    }
  }

  if (errors.length > 0) return { ok: false, imported, errors };
  await rebuildIndex(root);
  const sync = await verifyProjections(root);
  if (!sync.ok) {
    return {
      ok: false,
      imported,
      errors: ["projections sync failed", ...sync.errors],
    };
  }
  return { ok: true, imported, errors: [] };
}

export async function witnessTarget(
  root: string,
  target: string,
  actor: string,
): Promise<MutationResult> {
  const record = await resolveFqdn(root, target);
  if (!record) return { ok: false, errors: [`target not found: ${target}`] };
  if (record.descriptor.type !== "PublishDescriptor") {
    const hint = record.descriptor.type === "ProposedMutationDescriptor"
      ? ` — publish it first: \`t myc publish ${target}\`, then witness the resulting *.publish.myc.md`
      : "";
    return {
      ok: false,
      errors: [
        `WitnessDescriptor must target a PublishDescriptor, got ${record.descriptor.type}${hint}`,
      ],
    };
  }

  const verified = await verifyDescriptor(record.descriptor);
  if (!verified.ok) {
    return {
      ok: false,
      errors: [
        "Target descriptor structural verification failed",
        ...verified.errors,
      ],
    };
  }

  const descriptor: MycDescriptor = {
    type: "WitnessDescriptor",
    schema_version: "myc.witness.v0.1",
    fqdn: "",
    commitment: { algorithm: "sha256", value: "", covers: "descriptor.body" },
    body: {
      target_fqdn: record.descriptor.fqdn,
      target_commitment: record.descriptor.commitment.value,
      witness_actor: actor,
      timestamp: new Date().toISOString(),
      verification_status: "structurally_valid",
    },
  };
  descriptor.commitment.value = await sha256Hex(
    stableStringify(descriptor.body as unknown as Json),
  );
  const shortHash = descriptor.commitment.value.slice(0, 12);
  descriptor.fqdn = `h.${shortHash}.witness.myc.md`;
  const writePath = joinPath(
    root,
    "public",
    "consensus",
    "witness",
    "h",
    shortHash,
    descriptor.fqdn,
  );
  await writeDescriptorFile(
    writePath,
    descriptor,
    "Witness Descriptor",
    "Generated locally to prove receipt and structural validity.",
  );
  await rebuildIndex(root);
  return { ok: true, fqdn: descriptor.fqdn, path: writePath, errors: [] };
}

export async function reviewTarget(
  root: string,
  target: string,
  reviewer: string,
  rating: string,
  comment?: string,
): Promise<MutationResult> {
  if (!["approve", "reject", "neutral"].includes(rating)) {
    return {
      ok: false,
      errors: ["rating must be approve, reject, or neutral"],
    };
  }
  const record = await resolveFqdn(root, target);
  if (!record) return { ok: false, errors: [`target not found: ${target}`] };
  if (
    record.descriptor.type !== "IntentDescriptor" &&
    record.descriptor.type !== "PublishDescriptor"
  ) {
    return {
      ok: false,
      errors: [
        `ReviewDescriptor must target an IntentDescriptor or PublishDescriptor, got ${record.descriptor.type}`,
      ],
    };
  }

  const descriptor: MycDescriptor = {
    type: "ReviewDescriptor",
    schema_version: "myc.review.v0.1",
    fqdn: "",
    commitment: { algorithm: "sha256", value: "", covers: "descriptor.body" },
    body: {
      target_fqdn: record.descriptor.fqdn,
      target_commitment: record.descriptor.commitment.value,
      reviewer,
      rating,
      ...(comment ? { comment } : {}),
      timestamp: new Date().toISOString(),
    },
  };
  descriptor.commitment.value = await sha256Hex(
    stableStringify(descriptor.body as unknown as Json),
  );
  const shortHash = descriptor.commitment.value.slice(0, 12);
  descriptor.fqdn = `h.${shortHash}.review.myc.md`;
  const writePath = joinPath(
    root,
    "public",
    "consensus",
    "review",
    "h",
    shortHash,
    descriptor.fqdn,
  );
  await writeDescriptorFile(
    writePath,
    descriptor,
    "Review Descriptor",
    `Semantic evaluation: ${rating}`,
  );
  await rebuildIndex(root);
  return { ok: true, fqdn: descriptor.fqdn, path: writePath, errors: [] };
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
