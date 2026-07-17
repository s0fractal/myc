// Read-only lineage traversal and explanation projections.
// This module depends on descriptor/graph indexes, never on the CLI façade.

import { type Json } from "./verify_core.ts";
import { type MycDescriptor } from "./x0110_descriptor_core.ts";
import { nutritionForDescriptor } from "./x0130_nutrition.ts";
import {
  descriptorNodeKeys,
  parseDescriptorFile,
  resolveFqdn,
  verifyPath,
} from "./x0150_descriptor_index.ts";
import { type GraphEdge, graphEdges, refKeys } from "./x0160_graph.ts";

export interface LineageResult {
  ok: boolean;
  target: string;
  path?: string;
  descriptor?: MycDescriptor;
  backward: GraphEdge[];
  forward: GraphEdge[];
  errors: string[];
}

export async function resolveTargetRecord(
  root: string,
  target: string,
): Promise<{ path: string; descriptor: MycDescriptor } | null> {
  if (target.startsWith("/")) {
    return { path: target, descriptor: await parseDescriptorFile(target) };
  }
  return await resolveFqdn(root, target);
}

function edgeKey(edge: GraphEdge): string {
  return [
    edge.transform,
    JSON.stringify(edge.input),
    JSON.stringify(edge.output),
  ].join("|");
}

function intersects(left: Iterable<string>, right: Set<string>): boolean {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
}

export async function lineageFor(
  root: string,
  target: string,
): Promise<LineageResult> {
  const record = await resolveTargetRecord(root, target);
  if (!record) {
    return {
      ok: false,
      target,
      backward: [],
      forward: [],
      errors: ["target-not-found"],
    };
  }

  const edges = await graphEdges(root);
  const backward: GraphEdge[] = [];
  const forward: GraphEdge[] = [];
  const backwardSeen = new Set<string>();
  const forwardSeen = new Set<string>();

  let frontier = new Set(descriptorNodeKeys(record.descriptor));
  for (let depth = 0; depth < 12 && frontier.size > 0; depth++) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (!intersects(refKeys(edge.output), frontier)) continue;
      const key = edgeKey(edge);
      if (backwardSeen.has(key)) continue;
      backwardSeen.add(key);
      backward.push(edge);
      for (const inputKey of refKeys(edge.input)) next.add(inputKey);
    }
    frontier = next;
  }

  frontier = new Set(descriptorNodeKeys(record.descriptor));
  for (let depth = 0; depth < 12 && frontier.size > 0; depth++) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (!intersects(refKeys(edge.input), frontier)) continue;
      const key = edgeKey(edge);
      if (forwardSeen.has(key)) continue;
      forwardSeen.add(key);
      forward.push(edge);
      for (const outputKey of refKeys(edge.output)) next.add(outputKey);
    }
    frontier = next;
  }

  return {
    ok: true,
    target,
    path: record.path,
    descriptor: record.descriptor,
    backward,
    forward,
    errors: [],
  };
}

export async function explainTarget(
  root: string,
  target: string,
): Promise<Record<string, Json>> {
  const record = await resolveTargetRecord(root, target);
  if (!record) {
    return { ok: false, target, errors: ["target-not-found"] };
  }
  const verification = await verifyPath(record.path);
  const lineage = await lineageFor(root, target);
  return {
    ok: verification.ok && lineage.ok,
    target,
    path: record.path,
    summary: summarizeDescriptor(record.descriptor, lineage),
    descriptor: record.descriptor as unknown as Json,
    verification: {
      ok: verification.ok,
      errors: verification.errors,
    },
    lineage: {
      backward_count: lineage.backward.length,
      forward_count: lineage.forward.length,
      backward_steps: [...new Set(lineage.backward.map((edge) => edge.step))],
      forward_steps: [...new Set(lineage.forward.map((edge) => edge.step))],
    },
  };
}

export function summarizeDescriptor(
  descriptor: MycDescriptor,
  lineage: Pick<LineageResult, "backward" | "forward">,
): Record<string, Json> {
  const summary: Record<string, Json> = {
    type: descriptor.type,
    fqdn: descriptor.fqdn,
    commitment: descriptor.commitment.value,
    incoming_edges: lineage.backward.length,
    outgoing_edges: lineage.forward.length,
    incoming_transformations: uniqueTransformCount(lineage.backward),
    outgoing_transformations: uniqueTransformCount(lineage.forward),
  };
  if (descriptor.type === "RawDescriptor") {
    summary.raw_hash = descriptor.body.hash ?? null;
    summary.payload = descriptor.body.payload ?? null;
  }
  if (descriptor.type === "ArtifactDescriptor") {
    summary.target = descriptor.body.target ?? null;
    summary.intent = descriptor.body.intent ?? null;
    summary.naming_proof = descriptor.body.naming_proof ?? null;
    summary.proof_mode = descriptor.body.proof_mode ?? null;
    summary.payload_state = descriptor.body.payload_state ?? null;
  }
  if (descriptor.type === "TransformationDescriptor") {
    summary.step = descriptor.body.step ?? null;
    summary.direction = descriptor.body.direction ?? null;
    summary.function = descriptor.body.function ?? null;
  }
  summary.nutrition = nutritionForDescriptor(descriptor) as unknown as Json;
  return summary;
}

function uniqueTransformCount(edges: GraphEdge[]): number {
  return new Set(edges.map((edge) => edge.transform)).size;
}
