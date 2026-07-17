// Descriptor graph engine: deterministic edge projection plus fail-closed
// reference verification. This module owns graph.ndjson, not the CLI façade.

import { nutritionForDescriptor } from "./x0130_nutrition.ts";
import { joinPath } from "./x0140_paths.ts";
import {
  descriptorNodeKeys,
  type DescriptorRecord,
  scanDescriptors,
} from "./x0150_descriptor_index.ts";
import { verifyDescriptor } from "./x0120_descriptor_verify.ts";
import { type Json } from "./verify_core.ts";

export interface GraphEdge {
  transform: string;
  transform_path: string;
  step: string;
  direction: string;
  proof_mode: string;
  function_fqdn: string | null;
  function_commitment: string | null;
  input: Record<string, Json>;
  output: Record<string, Json>;
}

export interface GraphVerificationResult {
  ok: boolean;
  descriptor_count: number;
  transformation_count: number;
  edge_count: number;
  checked_references: number;
  graph_path: string;
  graph_synced: boolean;
  nutrition_counts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

function compareStable(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
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

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  if (index <= 0) return "/";
  return path.slice(0, index);
}

export function refKeys(ref: Record<string, Json>): string[] {
  const keys: string[] = [];
  for (const key of ["fqdn", "commitment", "hash", "artifact_hash"]) {
    const value = ref[key];
    if (typeof value === "string") keys.push(value);
  }
  return keys;
}

function toRecordArray(value: Json | undefined): Record<string, Json>[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, Json> =>
      item !== null && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (typeof value === "object" && value !== null) {
    return [value as Record<string, Json>];
  }
  return [];
}

export function transformationEdgesFor(record: DescriptorRecord): GraphEdge[] {
  const descriptor = record.descriptor;
  if (descriptor.type !== "TransformationDescriptor") return [];
  const body = descriptor.body;
  const inputs = toRecordArray(body.input);
  const outputs = toRecordArray(body.output);
  const fn = body.function as Record<string, Json> | undefined;
  const step = typeof body.step === "string" ? body.step : "unknown";
  const direction = typeof body.direction === "string"
    ? body.direction
    : "unknown";
  const proofMode = typeof body.proof_mode === "string"
    ? body.proof_mode
    : "unknown";
  const functionFqdn = typeof fn?.fqdn === "string" ? fn.fqdn : null;
  const functionCommitment = typeof fn?.commitment === "string"
    ? fn.commitment
    : null;
  return inputs.flatMap((input) =>
    outputs.map((output) => ({
      transform: descriptor.fqdn,
      transform_path: record.path,
      step,
      direction,
      proof_mode: proofMode,
      function_fqdn: functionFqdn,
      function_commitment: functionCommitment,
      input,
      output,
    }))
  );
}

export function graphEdgeRecord(
  edge: GraphEdge,
  includePath: boolean,
): Record<string, Json> {
  return {
    transform: edge.transform,
    ...(includePath ? { transform_path: edge.transform_path } : {}),
    step: edge.step,
    direction: edge.direction,
    proof_mode: edge.proof_mode,
    function_fqdn: edge.function_fqdn,
    function_commitment: edge.function_commitment,
    input: edge.input,
    output: edge.output,
  };
}

function descriptorFqdnMap(
  records: DescriptorRecord[],
): Map<string, DescriptorRecord> {
  const map = new Map<string, DescriptorRecord>();
  for (const record of records) {
    if (!map.has(record.descriptor.fqdn)) {
      map.set(record.descriptor.fqdn, record);
    }
  }
  return map;
}

function duplicateDescriptorFqdns(records: DescriptorRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const fqdn = record.descriptor.fqdn;
    counts.set(fqdn, (counts.get(fqdn) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([fqdn]) => fqdn)
    .sort();
}

function graphLines(edges: GraphEdge[]): string[] {
  return edges
    .map((edge) => graphEdgeRecord(edge, false))
    .sort((a, b) =>
      compareStable(
        `${a.transform}:${JSON.stringify(a.input)}:${JSON.stringify(a.output)}`,
        `${b.transform}:${JSON.stringify(b.input)}:${JSON.stringify(b.output)}`,
      )
    )
    .map((edge) => JSON.stringify(edge));
}

export async function graphEdges(root: string): Promise<GraphEdge[]> {
  const records = await scanDescriptors(root);
  return records.flatMap(transformationEdgesFor);
}

export async function rebuildGraph(root: string): Promise<string> {
  const lines = graphLines(await graphEdges(root));
  const graphPath = joinPath(root, "public", "graph.ndjson");
  await Deno.mkdir(dirname(graphPath), { recursive: true });
  await Deno.writeTextFile(graphPath, `${lines.join("\n")}\n`);
  return graphPath;
}

function verifyGraphReference(
  transformPath: string,
  ref: Record<string, Json>,
  byFqdn: Map<string, DescriptorRecord>,
  errors: string[],
  warnings: string[],
): number {
  const fqdn = typeof ref.fqdn === "string" ? ref.fqdn : null;
  if (refKeys(ref).length === 0) {
    errors.push(
      `${transformPath}: graph reference has no fqdn/commitment/hash`,
    );
    return 0;
  }
  if (!fqdn) {
    const role = typeof ref.role === "string" ? ref.role : "unknown";
    if (role !== "payload") {
      warnings.push(
        `${transformPath}: commitment-only reference with non-payload role '${role}'`,
      );
    }
    return 0;
  }
  const target = byFqdn.get(fqdn);
  if (!target) {
    errors.push(`${transformPath}: reference does not resolve: ${fqdn}`);
    return 0;
  }
  const nodeKeys = new Set(descriptorNodeKeys(target.descriptor));
  const commitment = typeof ref.commitment === "string" ? ref.commitment : null;
  if (commitment && !nodeKeys.has(commitment)) {
    errors.push(
      `${transformPath}: reference commitment ${commitment} does not match ${fqdn}`,
    );
  }
  return 1;
}

export async function verifyGraph(
  root: string,
): Promise<GraphVerificationResult> {
  const records = await scanDescriptors(root);
  const byFqdn = descriptorFqdnMap(records);
  const errors: string[] = [];
  const warnings: string[] = [];
  const nutritionCounts = new Map<string, number>();
  let checkedReferences = 0;

  for (const duplicate of duplicateDescriptorFqdns(records)) {
    errors.push(`Duplicate descriptor FQDN: ${duplicate}`);
  }
  for (const record of records) {
    const verification = await verifyDescriptor(record.descriptor);
    for (const error of verification.errors) {
      errors.push(`${record.path}: ${error}`);
    }
    const nutrition = nutritionForDescriptor(record.descriptor);
    nutritionCounts.set(
      nutrition.status,
      (nutritionCounts.get(nutrition.status) ?? 0) + 1,
    );
    if (nutrition.status === "speculative") {
      warnings.push(`${record.path}: nutrition status is speculative`);
    }
    if (nutrition.status === "stale" || nutrition.freshness === "stale") {
      warnings.push(`${record.path}: nutrition status is stale`);
    }
  }

  const transformations = records.filter((record) =>
    record.descriptor.type === "TransformationDescriptor"
  );
  for (const record of transformations) {
    const body = record.descriptor.body;
    const step = typeof body.step === "string" ? body.step : "";
    const direction = typeof body.direction === "string" ? body.direction : "";
    const proofMode = typeof body.proof_mode === "string"
      ? body.proof_mode
      : "";
    const inputs = toRecordArray(body.input);
    const outputs = toRecordArray(body.output);
    const fn = body.function as Record<string, Json> | undefined;

    if (!step) errors.push(`${record.path}: transformation.step is missing`);
    if (!["forward", "retrospective"].includes(direction)) {
      errors.push(
        `${record.path}: invalid transformation.direction '${direction}'`,
      );
    }
    if (!["deterministic", "witnessed", "sealed"].includes(proofMode)) {
      errors.push(
        `${record.path}: invalid transformation.proof_mode '${proofMode}'`,
      );
    }
    if (inputs.length === 0) {
      errors.push(`${record.path}: transformation.input is empty`);
    }
    if (outputs.length === 0) {
      errors.push(`${record.path}: transformation.output is empty`);
    }

    const functionFqdn = typeof fn?.fqdn === "string" ? fn.fqdn : null;
    const functionCommitment = typeof fn?.commitment === "string"
      ? fn.commitment
      : null;
    if (!functionFqdn) {
      errors.push(`${record.path}: transformation.function.fqdn is missing`);
    } else {
      const functionRecord = byFqdn.get(functionFqdn);
      if (!functionRecord) {
        errors.push(
          `${record.path}: function does not resolve: ${functionFqdn}`,
        );
      } else {
        checkedReferences++;
        if (functionRecord.descriptor.type !== "FunctionDescriptor") {
          errors.push(
            `${record.path}: ${functionFqdn} resolves to ${functionRecord.descriptor.type}, not FunctionDescriptor`,
          );
        }
        if (
          functionCommitment &&
          functionRecord.descriptor.commitment.value !== functionCommitment
        ) {
          errors.push(
            `${record.path}: function commitment mismatch for ${functionFqdn}`,
          );
        }
      }
    }
    for (const ref of [...inputs, ...outputs]) {
      checkedReferences += verifyGraphReference(
        record.path,
        ref,
        byFqdn,
        errors,
        warnings,
      );
    }
  }

  const edges = transformations.flatMap(transformationEdgesFor);
  const graphPath = joinPath(root, "public", "graph.ndjson");
  const expectedGraph = `${graphLines(edges).join("\n")}\n`;
  let graphSynced = false;
  if (await exists(graphPath)) {
    graphSynced = await Deno.readTextFile(graphPath) === expectedGraph;
    if (!graphSynced) {
      errors.push(
        `${graphPath}: graph.ndjson is stale; run 'deno task myc graph'`,
      );
    }
  } else {
    errors.push(
      `${graphPath}: graph.ndjson is missing; run 'deno task myc graph'`,
    );
  }

  return {
    ok: errors.length === 0,
    descriptor_count: records.length,
    transformation_count: transformations.length,
    edge_count: edges.length,
    checked_references: checkedReferences,
    graph_path: graphPath,
    graph_synced: graphSynced,
    nutrition_counts: Object.fromEntries(
      [...nutritionCounts.entries()].sort((a, b) => compareStable(a[0], b[0])),
    ),
    errors,
    warnings,
  };
}
