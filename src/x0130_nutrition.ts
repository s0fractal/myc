// Derived descriptor labels. This is a projection only: it never mutates the
// descriptor or participates in its commitment identity.

import { type MycDescriptor } from "./x0110_descriptor_core.ts";
import { type Json } from "./verify_core.ts";

export interface NutritionLabel {
  status: string;
  labels: string[];
  proof_mode: string;
  payload_state: string;
  freshness: string;
  reasons: string[];
}

export function payloadStateForDescriptor(
  descriptor: MycDescriptor,
): string {
  const payload = descriptor.body.payload;
  if (
    payload !== null && typeof payload === "object" && !Array.isArray(payload)
  ) {
    const state = (payload as Record<string, Json>).state;
    if (typeof state === "string") return state;
  }
  const payloadState = descriptor.body.payload_state;
  return typeof payloadState === "string" ? payloadState : "none";
}

function classificationConfidence(descriptor: MycDescriptor): string {
  const classification = descriptor.body.classification;
  if (
    classification !== null && typeof classification === "object" &&
    !Array.isArray(classification)
  ) {
    const confidence = (classification as Record<string, Json>).confidence;
    if (typeof confidence === "string") return confidence;
  }
  const confidence = descriptor.body.confidence;
  return typeof confidence === "string" ? confidence : "medium";
}

export function nutritionForDescriptor(
  descriptor: MycDescriptor,
  now = new Date(),
): NutritionLabel {
  const labels = new Set<string>();
  const reasons: string[] = [];
  const body = descriptor.body;
  const embedded = body.nutrition;
  const nutrition = embedded !== null && typeof embedded === "object" &&
      !Array.isArray(embedded)
    ? embedded as Record<string, Json>
    : {};

  const proofMode = typeof body.proof_mode === "string"
    ? body.proof_mode
    : descriptor.type === "FunctionDescriptor"
    ? "deterministic"
    : descriptor.type === "TransformationDescriptor"
    ? "deterministic"
    : "witnessed";

  labels.add(descriptor.type.replace(/Descriptor$/, "").toLowerCase());
  labels.add(proofMode);

  const payloadState = payloadStateForDescriptor(descriptor);
  if (payloadState !== "none") labels.add(payloadState);

  const confidence = classificationConfidence(descriptor);
  let status = typeof nutrition.status === "string"
    ? nutrition.status
    : confidence === "low"
    ? "speculative"
    : descriptor.type === "RawDescriptor"
    ? "raw"
    : "verified";

  let freshness = "current";
  const expiresAt = typeof nutrition.expires_at === "string"
    ? nutrition.expires_at
    : null;
  if (status === "stale") {
    freshness = "stale";
    reasons.push("explicit-stale-status");
  }
  if (expiresAt) {
    const expires = Date.parse(expiresAt);
    if (!Number.isNaN(expires) && expires <= now.getTime()) {
      status = "stale";
      freshness = "stale";
      reasons.push(`expired:${expiresAt}`);
    }
  }
  if (status === "speculative") {
    reasons.push("low-confidence-classification");
  }

  labels.add(status);
  return {
    status,
    labels: [...labels].sort(),
    proof_mode: proofMode,
    payload_state: payloadState,
    freshness,
    reasons,
  };
}
