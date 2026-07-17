// Deterministic public projections over the descriptor index and graph.

import {
  descriptorAddresses,
  type DescriptorRecord,
  scanDescriptors,
} from "./x0150_descriptor_index.ts";
import { rebuildGraph, verifyGraph } from "./x0160_graph.ts";
import { joinPath } from "./x0140_paths.ts";

export interface ProjectionVerificationResult {
  ok: boolean;
  index_path: string;
  graph_path: string;
  index_synced: boolean;
  graph_synced: boolean;
  descriptor_count: number;
  index_record_count: number;
  errors: string[];
  warnings: string[];
}

function compareStable(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  if (index <= 0) return "/";
  return path.slice(0, index);
}

function relativePath(root: string, file: string): string {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : file;
}

export function indexLines(
  root: string,
  records: DescriptorRecord[],
): string[] {
  return records
    .flatMap((record) =>
      descriptorAddresses(record.descriptor).map((fqdn) => ({
        fqdn,
        path: relativePath(root, record.path),
        type: record.descriptor.type,
        commitment: record.descriptor.commitment.value,
      }))
    )
    .sort((a, b) => compareStable(a.fqdn, b.fqdn))
    .map((entry) => JSON.stringify(entry));
}

export function sameNdjsonLines(actual: string, expected: string): boolean {
  const normalize = (value: string) =>
    value.split("\n").filter((line) => line.length > 0).sort(compareStable);
  const actualLines = normalize(actual);
  const expectedLines = normalize(expected);
  if (actualLines.length !== expectedLines.length) return false;
  return actualLines.every((line, index) => line === expectedLines[index]);
}

export async function rebuildIndex(root: string): Promise<string> {
  const records = await scanDescriptors(root);
  const indexPath = joinPath(root, "public", "index.ndjson");
  await Deno.mkdir(dirname(indexPath), { recursive: true });
  await Deno.writeTextFile(
    indexPath,
    `${indexLines(root, records).join("\n")}\n`,
  );
  await rebuildGraph(root);
  return indexPath;
}

export async function verifyProjections(
  root: string,
): Promise<ProjectionVerificationResult> {
  const records = await scanDescriptors(root);
  const graph = await verifyGraph(root);
  const indexPath = joinPath(root, "public", "index.ndjson");
  const lines = indexLines(root, records);
  const expectedIndex = `${lines.join("\n")}\n`;
  const errors = [...graph.errors];
  let indexSynced = false;

  try {
    indexSynced = sameNdjsonLines(
      await Deno.readTextFile(indexPath),
      expectedIndex,
    );
    if (!indexSynced) {
      errors.push(
        `${indexPath}: index.ndjson is stale; run 'deno task myc index'`,
      );
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    errors.push(
      `${indexPath}: index.ndjson is missing; run 'deno task myc index'`,
    );
  }

  return {
    ok: errors.length === 0,
    index_path: indexPath,
    graph_path: graph.graph_path,
    index_synced: indexSynced,
    graph_synced: graph.graph_synced,
    descriptor_count: records.length,
    index_record_count: lines.length,
    errors,
    warnings: graph.warnings,
  };
}
