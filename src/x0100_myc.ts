import { handleResolverRequest } from "./x0190_http.ts";
import {
  adapterDryRun,
  explainAvailability,
  recipeDryRun,
  verificationReceipts,
} from "./x01A0_policy_services.ts";
import { verifyRawPayload } from "./x01D0_capture_pipeline.ts";
import { main } from "./x01E0_cli.ts";

export {
  type Json,
  sha256Hex,
  stableStringify,
  verifyCommitment,
} from "./verify_core.ts";
export {
  classifyText,
  makeDescriptor,
  type MycDescriptor,
  slug,
} from "./x0110_descriptor_core.ts";
export { verifyDescriptor } from "./x0120_descriptor_verify.ts";
export {
  nutritionForDescriptor,
  type NutritionLabel,
} from "./x0130_nutrition.ts";
export { defaultRoot, joinPath } from "./x0140_paths.ts";
export {
  parseDescriptorFile,
  resolveFqdn,
  scanDescriptors,
  verifyPath,
} from "./x0150_descriptor_index.ts";
export {
  graphEdges,
  type GraphVerificationResult,
  rebuildGraph,
  verifyGraph,
} from "./x0160_graph.ts";
export {
  type ProjectionVerificationResult,
  rebuildIndex,
  verifyProjections,
} from "./x0170_projections.ts";
export {
  explainTarget,
  lineageFor,
  type LineageResult,
  resolveTargetRecord,
} from "./x0180_lineage.ts";
export {
  type AuditEntry,
  auditEntry,
  formatAuditEntry,
  type ResolverServices,
} from "./x0190_http.ts";
export {
  adapterDryRun,
  type AdapterDryRunResult,
  type AvailabilityExplanation,
  explainAvailability,
  recipeDryRun,
  type RecipeDryRunResult,
  type VerificationReceiptRecord,
  verificationReceipts,
} from "./x01A0_policy_services.ts";
export {
  importGraph,
  type ImportGraphResult,
  type MutationResult,
  publishTarget,
  reviewTarget,
  witnessTarget,
} from "./x01C0_mutation_lifecycle.ts";
export {
  type CaptureOptions,
  type CaptureResult,
  captureText,
  type PublishedRecord,
  reconcilePublished,
  reprojectRaw,
  verifyRawPayload,
} from "./x01D0_capture_pipeline.ts";
export { main, renderCaptureHuman } from "./x01E0_cli.ts";

export async function handleRequest(
  root: string,
  request: Request,
): Promise<Response> {
  return await handleResolverRequest(root, request, {
    verifyRawPayload,
    verificationReceipts,
    explainAvailability,
    adapterDryRun,
    recipeDryRun,
  });
}

if (import.meta.main) {
  main(Deno.args).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  });
}
