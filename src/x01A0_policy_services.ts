// Read-only policy inspection services used by both CLI and HTTP surfaces.
// No capture, publication, consensus, or mutation authority belongs here.

import { payloadStateForDescriptor } from "./x0130_nutrition.ts";
import { joinPath } from "./x0140_paths.ts";
import { resolveFqdn } from "./x0150_descriptor_index.ts";

export interface RecipeDryRunResult {
  ok: boolean;
  target: string;
  function_fqdn?: string;
  context_policy?: string;
  payload_policy?: string;
  side_effects?: string[];
  proof_mode?: string;
  output_contract?: string;
  errors: string[];
}

export interface AdapterDryRunResult {
  ok: boolean;
  adapter: string;
  path: string;
  status?: string;
  read_policy?: string;
  write_policy?: string;
  payload_policy?: string;
  side_effects?: string[];
  verification?: string[];
  failure_mode?: string;
  output_contract: string[];
  execution_enabled: false;
  errors: string[];
}

export interface AvailabilityExplanation {
  ok: boolean;
  target: string;
  fqdn?: string;
  descriptor_type?: string;
  payload_state: string;
  payload_available_to_requester: boolean;
  private_payload_present: boolean;
  unavailable_reason: string;
  access_mode: string;
  safe_next_steps: string[];
  errors: string[];
}

export interface VerificationReceiptRecord {
  name: string;
  path: string;
}

export async function recipeDryRun(
  root: string,
  target: string,
): Promise<RecipeDryRunResult> {
  const result: RecipeDryRunResult = {
    ok: false,
    target,
    errors: [],
  };

  try {
    const artifact = await resolveFqdn(root, target);
    if (!artifact) {
      result.errors.push(`target '${target}' not found`);
      return result;
    }
    if (artifact.descriptor.type !== "RecipeDescriptor") {
      result.errors.push(
        `target is not a RecipeDescriptor: ${artifact.descriptor.type}`,
      );
      return result;
    }

    const recipe = artifact.descriptor.body.recipe as Record<string, unknown>;
    if (!recipe) {
      result.errors.push("RecipeDescriptor missing 'recipe' body");
      return result;
    }

    result.function_fqdn = String(recipe.function || "unknown");
    result.context_policy = String(recipe.context_policy || "unknown");
    result.payload_policy = String(recipe.payload_policy || "unknown");
    result.side_effects = Array.isArray(recipe.side_effects)
      ? recipe.side_effects.map(String)
      : ["unknown"];
    result.proof_mode = String(recipe.proof_mode || "unknown");
    result.output_contract = String(recipe.output_contract || "unknown");
    result.ok = true;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

export async function adapterDryRun(
  root: string,
  adapter: string,
): Promise<AdapterDryRunResult> {
  const path = joinPath(root, "substrates", adapter, "MYC.md");
  const errors: string[] = [];
  let text = "";
  try {
    text = await Deno.readTextFile(path);
  } catch {
    return {
      ok: false,
      adapter,
      path,
      output_contract: [],
      execution_enabled: false,
      errors: [`adapter '${adapter}' not found`],
    };
  }

  if (!text.includes("adapter_policy:")) {
    errors.push("missing adapter_policy");
  }

  const result: AdapterDryRunResult = {
    ok: false,
    adapter,
    path,
    status: policyScalar(text, "status"),
    read_policy: policyScalar(text, "read_policy"),
    write_policy: policyScalar(text, "write_policy"),
    payload_policy: policyScalar(text, "payload_policy"),
    side_effects: policyList(text, "side_effects"),
    verification: policyList(text, "verification"),
    failure_mode: policyScalar(text, "failure_mode"),
    output_contract: [
      "descriptor",
      "transform",
      "receipt",
      "proposal",
      "warning",
    ],
    execution_enabled: false,
    errors,
  };

  for (
    const key of [
      "status",
      "read_policy",
      "write_policy",
      "payload_policy",
      "failure_mode",
    ] as const
  ) {
    if (!result[key]) errors.push(`missing ${key}`);
  }
  for (const key of ["side_effects", "verification"] as const) {
    if (!result[key] || result[key]?.length === 0) {
      errors.push(`missing ${key}`);
    }
  }

  result.ok = errors.length === 0;
  return result;
}

export async function explainAvailability(
  root: string,
  target: string,
): Promise<AvailabilityExplanation> {
  const record = await resolveFqdn(root, target);
  if (!record) {
    return {
      ok: false,
      target,
      payload_state: "unknown",
      payload_available_to_requester: false,
      private_payload_present: false,
      unavailable_reason: "descriptor-not-found",
      access_mode: "none",
      safe_next_steps: ["resolve a known descriptor FQDN"],
      errors: [`descriptor not found: ${target}`],
    };
  }

  const descriptor = record.descriptor;
  const payloadState = payloadStateForDescriptor(descriptor);
  const rawHash = typeof descriptor.body.hash === "string"
    ? descriptor.body.hash
    : undefined;
  const privatePayloadPresent = rawHash
    ? await exists(joinPath(root, "private", "payloads", `${rawHash}.txt`))
    : false;
  const mode = accessModeForPayload(payloadState, privatePayloadPresent);

  return {
    ok: true,
    target,
    fqdn: descriptor.fqdn,
    descriptor_type: descriptor.type,
    payload_state: payloadState,
    payload_available_to_requester: mode.available,
    private_payload_present: privatePayloadPresent,
    unavailable_reason: mode.reason,
    access_mode: mode.accessMode,
    safe_next_steps: mode.nextSteps,
    errors: [],
  };
}

export async function verificationReceipts(
  root: string,
): Promise<VerificationReceiptRecord[]> {
  const dir = joinPath(root, "public", "verification");
  if (!(await exists(dir))) return [];
  const records: VerificationReceiptRecord[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    records.push({
      name: entry.name,
      path: `public/verification/${entry.name}`,
    });
  }
  return records.sort((a, b) => compareStable(a.name, b.name));
}

function policyScalar(text: string, key: string): string | undefined {
  const match = text.match(
    new RegExp(`\\b${key}:\\s*(?:"([^"]+)"|([^\\n#]+))`),
  );
  const value = match?.[1] ?? match?.[2];
  return value?.trim();
}

function policyList(text: string, key: string): string[] {
  const match = text.match(new RegExp(`\\b${key}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return match[1].split(",").map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function accessModeForPayload(
  payloadState: string,
  privatePayloadPresent: boolean,
): {
  available: boolean;
  reason: string;
  accessMode: string;
  nextSteps: string[];
} {
  if (payloadState === "none") {
    return {
      available: true,
      reason: "no-payload-required",
      accessMode: "descriptor-only",
      nextSteps: ["verify descriptor commitment"],
    };
  }
  if (payloadState === "private-local") {
    return privatePayloadPresent
      ? {
        available: true,
        reason: "available-to-local-owner",
        accessMode: "local-private",
        nextSteps: ["verify with --with-private when explicitly needed"],
      }
      : {
        available: false,
        reason: "private-payload-missing",
        accessMode: "commitment-only",
        nextSteps: ["use descriptor commitment", "request owner capability"],
      };
  }
  if (payloadState === "remote-capability") {
    return {
      available: false,
      reason: "requires-owner-capability",
      accessMode: "capability-gated",
      nextSteps: ["request capability", "accept sealed receipt"],
    };
  }
  if (payloadState === "known-but-unavailable") {
    return {
      available: false,
      reason: "known-but-unavailable",
      accessMode: "commitment-only",
      nextSteps: ["use descriptor commitment", "wait for receipt"],
    };
  }
  if (payloadState === "witness-only") {
    return {
      available: false,
      reason: "witness-only",
      accessMode: "sealed-or-witnessed",
      nextSteps: ["request witness receipt", "verify sealed claim"],
    };
  }
  return {
    available: false,
    reason: `unsupported-payload-state:${payloadState}`,
    accessMode: "unknown",
    nextSteps: ["treat as commitment-only"],
  };
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
