import { joinPath, parseDescriptorFile } from "./x0100_myc.ts";

export interface ProtocolAuditResult {
  ok: boolean;
  checked_files: number;
  errors: string[];
  warnings: string[];
}

const ALLOWED_DESCRIPTOR_TYPES = new Set([
  "RawDescriptor",
  "FunctionDescriptor",
  "TransformationDescriptor",
  "IntentDescriptor",
  "NamingProofDescriptor",
  "ArtifactDescriptor",
  "RecipeDescriptor",
  "CapabilityDescriptor",
  "SealedReceiptDescriptor",
  "PublishDescriptor",
  "WitnessDescriptor",
  "ReviewDescriptor",
  "ProposedMutationDescriptor",
  "ProposalResolutionDescriptor",
  "VectorDocumentDescriptor",
  "myc.roadmap-projection",
  "myc.probes-projection",
]);

const LOCKED_FUNCTION_FQDNS = new Set([
  "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
  "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
  "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
  "h.7efa1b6e7564.myc-quarantine-policy.function.myc.md",
]);

export async function auditRoot(root: string): Promise<ProtocolAuditResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = await listFiles(root);

  for (const file of files) {
    const relative = relativePath(root, file);
    if (relative.startsWith("public/")) {
      await auditPublicFile(file, relative, errors);
    }
    if (relative.startsWith("private/")) {
      auditPrivateFile(relative, errors);
    }
    if (/^substrates\/[^/]+\/MYC\.md$/.test(relative)) {
      await auditSubstratePolicy(file, relative, errors);
    }
    if (/^substrates\/[^/]+\/receipts\/.*\.md$/.test(relative)) {
      await auditImportedReceipt(file, relative, errors);
    }
    if (relative.startsWith("protocols/recipes/")) {
      await auditRecipeDraftPolicy(file, relative, errors);
    }
    if (relative.startsWith("protocols/capabilities/")) {
      await auditCapabilityDraftPolicy(file, relative, errors);
    }
    if (relative.startsWith("protocols/sealed/")) {
      await auditSealedDraftPolicy(file, relative, errors);
    }
    if (file.endsWith(".md")) {
      await auditDescriptorFile(file, relative, errors, warnings);
    }
  }

  auditCoreFunctionSet(files.map((file) => relativePath(root, file)), errors);

  return {
    ok: errors.length === 0,
    checked_files: files.length,
    errors,
    warnings,
  };
}

async function auditPublicFile(
  file: string,
  relative: string,
  errors: string[],
): Promise<void> {
  if (relative.startsWith("public/capabilities/")) {
    errors.push(`${relative}: public capability descriptors are not enabled`);
  }
  if (relative.startsWith("public/recipes/")) {
    errors.push(`${relative}: public recipe descriptors are not enabled`);
  }

  const text = await Deno.readTextFile(file);
  if (/(^|["'\s])\/(?:Users|home)\//.test(text)) {
    errors.push(`${relative}: public file contains a local absolute path`);
  }
  if (text.includes("private/payloads/")) {
    errors.push(`${relative}: public file references private payload storage`);
  }
  if (/contains_payload"\s*:\s*true/.test(text)) {
    errors.push(`${relative}: public descriptor claims embedded payload bytes`);
  }
  if (secretLike(text)) {
    errors.push(`${relative}: public file contains secret-like material`);
  }
}

function auditPrivateFile(relative: string, errors: string[]): void {
  if (relative.startsWith("private/payloads/")) return;
  const allowed = new Set([
    "private/README.md",
    "private/links/README.md",
    "private/capabilities/README.md",
  ]);
  if (!allowed.has(relative)) {
    errors.push(`${relative}: private file is present in repo workspace`);
  }
}

async function auditSubstratePolicy(
  file: string,
  relative: string,
  errors: string[],
): Promise<void> {
  const text = await Deno.readTextFile(file);
  for (
    const key of [
      "adapter_policy:",
      "read_policy:",
      "write_policy:",
      "payload_policy:",
      "side_effects:",
      "verification:",
      "failure_mode:",
    ]
  ) {
    if (!text.includes(key)) {
      errors.push(`${relative}: missing required adapter policy key '${key}'`);
    }
  }
}

async function auditImportedReceipt(
  file: string,
  relative: string,
  errors: string[],
): Promise<void> {
  const text = await Deno.readTextFile(file);
  if (!text.includes('type: "SealedReceiptDescriptor"')) {
    errors.push(
      `${relative}: imported receipt must be a SealedReceiptDescriptor`,
    );
  }
  for (const key of ["intent_hash:", "status:", "signature:"]) {
    if (!text.includes(key)) {
      errors.push(
        `${relative}: imported receipt missing required key '${key}'`,
      );
    }
  }
}

async function auditRecipeDraftPolicy(
  file: string,
  relative: string,
  errors: string[],
): Promise<void> {
  const text = await Deno.readTextFile(file);
  if (!text.includes("recipe:")) return;

  for (
    const key of [
      "function:",
      "params:",
      "context_policy:",
      "payload_policy:",
      "allowed_paths:",
      "forbidden_paths:",
      "side_effects:",
      "proof_mode:",
      "output_contract:",
      "dry_run:",
    ]
  ) {
    if (!text.includes(key)) {
      errors.push(`${relative}: missing required recipe draft key '${key}'`);
    }
  }
}

async function auditCapabilityDraftPolicy(
  file: string,
  relative: string,
  errors: string[],
): Promise<void> {
  const text = await Deno.readTextFile(file);
  if (!text.includes("capability_contract:")) return;

  for (
    const key of [
      "subject:",
      "requester:",
      "operation:",
      "payload_policy:",
      "retention_policy:",
      "disclosure_policy:",
      "expiry:",
      "revocation:",
      "proof_mode:",
      "secret_material:",
    ]
  ) {
    if (!text.includes(key)) {
      errors.push(
        `${relative}: missing required capability draft key '${key}'`,
      );
    }
  }
}

async function auditSealedDraftPolicy(
  file: string,
  relative: string,
  errors: string[],
): Promise<void> {
  const text = await Deno.readTextFile(file);
  if (!text.includes("sealed_receipt_contract:")) return;

  for (
    const key of [
      "subject:",
      "claim:",
      "proof_reference:",
      "verifier:",
      "disclosure_policy:",
      "unavailable_reason:",
      "payload_retained:",
      "replay_policy:",
    ]
  ) {
    if (!text.includes(key)) {
      errors.push(`${relative}: missing required sealed draft key '${key}'`);
    }
  }
}

async function auditDescriptorFile(
  file: string,
  relative: string,
  errors: string[],
  warnings: string[],
): Promise<void> {
  let descriptor;
  try {
    descriptor = await parseDescriptorFile(file);
  } catch {
    return;
  }

  if (!ALLOWED_DESCRIPTOR_TYPES.has(descriptor.type)) {
    errors.push(
      `${relative}: descriptor type '${descriptor.type}' is not enabled by the current roadmap phase`,
    );
  }

  if (
    descriptor.type === "FunctionDescriptor" &&
    Object.hasOwn(descriptor.body, "nutrition")
  ) {
    errors.push(
      `${relative}: FunctionDescriptor identity body must not include nutrition metadata`,
    );
  }

  if (descriptor.type === "RecipeDescriptor") {
    const body = descriptor.body;
    if (!body.recipe || typeof body.recipe !== "object") {
      errors.push(`${relative}: RecipeDescriptor must have a 'recipe' object`);
    } else {
      const r = body.recipe as Record<string, unknown>;
      if (!r.function || typeof r.function !== "string") {
        errors.push(`${relative}: RecipeDescriptor must declare 'function'`);
      }
      if (!r.context_policy || typeof r.context_policy !== "string") {
        errors.push(
          `${relative}: RecipeDescriptor must declare 'context_policy'`,
        );
      }
      if (!r.payload_policy || typeof r.payload_policy !== "string") {
        errors.push(
          `${relative}: RecipeDescriptor must declare 'payload_policy'`,
        );
      }
      if (!Array.isArray(r.side_effects)) {
        errors.push(
          `${relative}: RecipeDescriptor must declare 'side_effects' array`,
        );
      }
      if (!r.proof_mode || typeof r.proof_mode !== "string") {
        errors.push(`${relative}: RecipeDescriptor must declare 'proof_mode'`);
      }
      if (!r.output_contract || typeof r.output_contract !== "string") {
        errors.push(
          `${relative}: RecipeDescriptor must declare 'output_contract'`,
        );
      }
      if (r.dry_run !== true) {
        errors.push(
          `${relative}: RecipeDescriptor must have 'dry_run: true' for safe inspection`,
        );
      }
    }
  }
  if (descriptor.type === "IntentDescriptor") {
    const body = descriptor.body;

    if (!body.intent || typeof body.intent !== "object") {
      errors.push(`${relative}: IntentDescriptor must have an 'intent' object`);
    } else {
      const intent = body.intent as Record<string, unknown>;
      const requiredKeys = [
        "id",
        "raw",
        "actor",
        "kind",
        "actionability",
        "language",
      ];
      for (const key of requiredKeys) {
        if (!intent[key] || typeof intent[key] !== "string") {
          errors.push(
            `${relative}: IntentDescriptor.intent must declare '${key}'`,
          );
        }
      }
    }

    if (!body.address || typeof body.address !== "object") {
      errors.push(
        `${relative}: IntentDescriptor must have an 'address' object`,
      );
    } else {
      const address = body.address as Record<string, unknown>;
      if (!address.fqdn || typeof address.fqdn !== "string") {
        errors.push(
          `${relative}: IntentDescriptor.address must declare 'fqdn'`,
        );
      }
    }

    if (!body.context_chain || typeof body.context_chain !== "object") {
      errors.push(
        `${relative}: IntentDescriptor must have a 'context_chain' object`,
      );
    }

    if (!body.materialization || typeof body.materialization !== "object") {
      errors.push(
        `${relative}: IntentDescriptor must have a 'materialization' object`,
      );
    }
  }

  if (descriptor.type === "CapabilityDescriptor") {
    const body = descriptor.body;
    if (
      !body.capability_contract || typeof body.capability_contract !== "object"
    ) {
      errors.push(
        `${relative}: CapabilityDescriptor must have a 'capability_contract' object`,
      );
    } else {
      const c = body.capability_contract as Record<string, unknown>;
      const requiredKeys = [
        "subject",
        "requester",
        "operation",
        "payload_policy",
        "retention_policy",
        "disclosure_policy",
        "expiry",
        "revocation",
        "proof_mode",
        "secret_material",
      ];
      for (const key of requiredKeys) {
        if (!c[key] || typeof c[key] !== "string") {
          errors.push(
            `${relative}: CapabilityDescriptor must declare '${key}'`,
          );
        }
      }
    }
  }

  if (descriptor.type === "SealedReceiptDescriptor") {
    const body = descriptor.body;
    if (
      !body.sealed_receipt_contract ||
      typeof body.sealed_receipt_contract !== "object"
    ) {
      errors.push(
        `${relative}: SealedReceiptDescriptor must have a 'sealed_receipt_contract' object`,
      );
    } else {
      const s = body.sealed_receipt_contract as Record<string, unknown>;
      const requiredKeys = [
        "subject",
        "claim",
        "proof_reference",
        "verifier",
        "disclosure_policy",
        "unavailable_reason",
        "replay_policy",
      ];
      for (const key of requiredKeys) {
        if (!s[key] || typeof s[key] !== "string") {
          errors.push(
            `${relative}: SealedReceiptDescriptor must declare '${key}'`,
          );
        }
      }
      if (typeof s.payload_retained !== "boolean") {
        errors.push(
          `${relative}: SealedReceiptDescriptor must declare 'payload_retained' as boolean`,
        );
      }
    }
  }

  if (descriptor.type === "PublishDescriptor") {
    const body = descriptor.body;
    if (
      !body.publish_clearance ||
      typeof body.publish_clearance !== "object"
    ) {
      errors.push(
        `${relative}: PublishDescriptor must have a 'publish_clearance' object`,
      );
    } else {
      const pc = body.publish_clearance as Record<string, unknown>;
      const requiredKeys = ["target_fqdn", "target_commitment", "export_scope"];
      for (const key of requiredKeys) {
        if (!pc[key] || typeof pc[key] !== "string") {
          errors.push(
            `${relative}: PublishDescriptor.publish_clearance must declare '${key}'`,
          );
        }
      }
      if (
        !["single", "closure", "subgraph"].includes(
          pc.export_scope as string,
        )
      ) {
        errors.push(
          `${relative}: PublishDescriptor.publish_clearance.export_scope must be 'single', 'closure', or 'subgraph'`,
        );
      }
    }

    if (
      !body.publication_gates ||
      typeof body.publication_gates !== "object"
    ) {
      errors.push(
        `${relative}: PublishDescriptor must have a 'publication_gates' object`,
      );
    } else {
      const pg = body.publication_gates as Record<string, unknown>;
      const requiredKeys = [
        "naming_proof_verified",
        "graph_verified",
        "payload_scrubbed",
      ];
      for (const key of requiredKeys) {
        if (typeof pg[key] !== "boolean") {
          errors.push(
            `${relative}: PublishDescriptor.publication_gates must declare '${key}' as boolean`,
          );
        }
      }
    }

    if (!Array.isArray(body.destinations)) {
      errors.push(
        `${relative}: PublishDescriptor must have a 'destinations' array`,
      );
    }
    // Optional thread to the originating apply-receipt (lifecycle apply→published).
    if (
      Object.hasOwn(body, "derived_from") &&
      typeof body.derived_from !== "string"
    ) {
      errors.push(
        `${relative}: PublishDescriptor.derived_from must be a string (apply-receipt id) when present`,
      );
    }
  }

  if (descriptor.type === "WitnessDescriptor") {
    const body = descriptor.body as Record<string, unknown>;
    if (typeof body.target_fqdn !== "string") {
      errors.push(
        `${relative}: WitnessDescriptor must have a 'target_fqdn' string`,
      );
    }
    if (typeof body.target_commitment !== "string") {
      errors.push(
        `${relative}: WitnessDescriptor must have a 'target_commitment' string`,
      );
    }
    if (typeof body.witness_actor !== "string") {
      errors.push(
        `${relative}: WitnessDescriptor must have a 'witness_actor' string`,
      );
    }
    if (body.verification_status !== "structurally_valid") {
      errors.push(
        `${relative}: WitnessDescriptor.verification_status must be 'structurally_valid'`,
      );
    }
  }

  if (descriptor.type === "ReviewDescriptor") {
    const body = descriptor.body as Record<string, unknown>;
    if (typeof body.target_fqdn !== "string") {
      errors.push(
        `${relative}: ReviewDescriptor must have a 'target_fqdn' string`,
      );
    }
    if (typeof body.target_commitment !== "string") {
      errors.push(
        `${relative}: ReviewDescriptor must have a 'target_commitment' string`,
      );
    }
    if (typeof body.reviewer !== "string") {
      errors.push(
        `${relative}: ReviewDescriptor must have a 'reviewer' string`,
      );
    }
    if (!["approve", "reject", "neutral"].includes(body.rating as string)) {
      errors.push(
        `${relative}: ReviewDescriptor.rating must be 'approve', 'reject', or 'neutral'`,
      );
    }
  }

  if (descriptor.type === "ProposedMutationDescriptor") {
    const body = descriptor.body as Record<string, unknown>;
    if (
      typeof body.proposal !== "string" || !(body.proposal as string).trim()
    ) {
      errors.push(
        `${relative}: ProposedMutationDescriptor must have a non-empty 'proposal' string`,
      );
    }
    if (typeof body.proposer !== "string") {
      errors.push(
        `${relative}: ProposedMutationDescriptor must have a 'proposer' string`,
      );
    }
    if (
      !["omega", "liquid", "trinity", "spore"].includes(
        body.requires_verification as string,
      )
    ) {
      errors.push(
        `${relative}: ProposedMutationDescriptor.requires_verification must be 'omega', 'liquid', 'trinity', or 'spore'`,
      );
    }
    // SAFETY INVARIANT: a proposal is ALWAYS dormant. Trust is earned through the
    // witness/publish flow, never self-declared — so a forged 'resonant' or
    // 'witnessed' proposal is rejected at the protocol gate.
    if (body.state !== "dormant") {
      errors.push(
        `${relative}: ProposedMutationDescriptor.state must be 'dormant' (proposals never self-declare trust)`,
      );
    }
    // Optional TYPED finality policy (codex bootstrap x2900_954396): when present,
    // `finality_policy.classes` must be a map of class → positive integer. Fail
    // closed on a malformed policy — prose is not policy, and a broken policy must
    // never silently degrade to the looser default quorum.
    if (Object.hasOwn(body, "finality_policy")) {
      const fp = body.finality_policy as { classes?: unknown };
      const classes = fp?.classes as Record<string, unknown> | undefined;
      const ok = classes && typeof classes === "object" &&
        Object.keys(classes).length > 0 &&
        Object.values(classes).every((v) =>
          typeof v === "number" && Number.isInteger(v) && v > 0
        );
      if (!ok) {
        errors.push(
          `${relative}: ProposedMutationDescriptor.finality_policy.classes must be a non-empty map of class → positive integer`,
        );
      }
    }
    // `action_grant` (actuation authority, codex x5d00_954412) must carry a
    // non-empty intent_commitment string. Fail closed — a malformed grant must
    // never become an exploitable or ambiguous authority.
    if (Object.hasOwn(body, "action_grant")) {
      const ag = body.action_grant as { intent_commitment?: unknown };
      if (
        !ag || typeof ag !== "object" ||
        typeof ag.intent_commitment !== "string" ||
        ag.intent_commitment.trim().length === 0
      ) {
        errors.push(
          `${relative}: ProposedMutationDescriptor.action_grant must be { intent_commitment: <non-empty string> }`,
        );
      }
    }
  }

  if (descriptor.type === "ProposalResolutionDescriptor") {
    const body = descriptor.body as Record<string, unknown>;
    if (typeof body.proposal_commitment !== "string") {
      errors.push(
        `${relative}: ProposalResolutionDescriptor must bind a 'proposal_commitment' string`,
      );
    }
    if (typeof body.resolver !== "string") {
      errors.push(
        `${relative}: ProposalResolutionDescriptor must have a 'resolver' string`,
      );
    }
    if (
      !["implemented", "rejected", "superseded", "withdrawn", "expired"]
        .includes(body.outcome as string)
    ) {
      errors.push(
        `${relative}: ProposalResolutionDescriptor.outcome must be implemented|rejected|superseded|withdrawn|expired`,
      );
    }
    // v0.2: structured evidence_refs (optional — v0.1 with free-text evidence
    // stays readable). When present, each ref must be {kind, ref, commitment}.
    if (Object.hasOwn(body, "evidence_refs")) {
      const refs = body.evidence_refs;
      if (!Array.isArray(refs)) {
        errors.push(
          `${relative}: ProposalResolutionDescriptor.evidence_refs must be an array`,
        );
      } else {
        for (const r of refs) {
          const e = r as Record<string, unknown>;
          if (
            typeof e?.kind !== "string" || typeof e?.ref !== "string" ||
            typeof e?.commitment !== "string"
          ) {
            errors.push(
              `${relative}: each evidence_ref must have string kind, ref, commitment`,
            );
            break;
          }
        }
      }
    }
  }

  if (
    descriptor.type === "ArtifactDescriptor" &&
    Object.hasOwn(descriptor.body, "nutrition")
  ) {
    warnings.push(
      `${relative}: embedded nutrition is allowed only as transitional metadata; prefer derived nutrition`,
    );
  }
}

function auditCoreFunctionSet(files: string[], errors: string[]): void {
  const actual = files
    .filter((file) => file.startsWith("public/functions/"))
    .map((file) => file.replace(/^public\/functions\//, ""))
    .filter((file) => file.endsWith(".function.myc.md"))
    .sort();
  const expected = [...LOCKED_FUNCTION_FQDNS].sort();

  if (actual.length !== expected.length) {
    errors.push(
      `public/functions: expected ${expected.length} locked functions, found ${actual.length}`,
    );
  }
  for (const fqdn of expected) {
    if (!actual.includes(fqdn)) {
      errors.push(`public/functions: missing locked function ${fqdn}`);
    }
  }
  for (const fqdn of actual) {
    if (!LOCKED_FUNCTION_FQDNS.has(fqdn)) {
      errors.push(`public/functions: unexpected function descriptor ${fqdn}`);
    }
  }
}

function secretLike(text: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/.test(text) ||
    /\bsk-[A-Za-z0-9_-]{20,}\b/.test(text) ||
    /\bAIza[0-9A-Za-z_-]{20,}\b/.test(text);
}

async function listFiles(root: string): Promise<string[]> {
  const ignoredPrefixes = [
    ".git/",
    "node_modules/",
    ".wrangler/",
  ];
  const result: string[] = [];
  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const path = joinPath(dir, entry.name);
      const relative = relativePath(root, path);
      if (ignoredPrefixes.some((prefix) => relative.startsWith(prefix))) {
        continue;
      }
      if (entry.isDirectory) {
        await walk(path);
      } else if (entry.isFile) {
        result.push(path);
      }
    }
  }
  await walk(root);
  return result.sort();
}

function relativePath(root: string, file: string): string {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : file;
}

if (import.meta.main) {
  const root = Deno.args[0] ?? Deno.cwd();
  const result = await auditRoot(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) Deno.exit(1);
}
