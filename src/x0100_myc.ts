import {
  type Json,
  sha256Hex,
  stableStringify,
  verifyCommitment,
} from "./verify_core.ts";
import {
  classifyText,
  makeDescriptor,
  type MycDescriptor,
  slug,
} from "./x0110_descriptor_core.ts";
import { verifyDescriptor } from "./x0120_descriptor_verify.ts";
import {
  nutritionForDescriptor,
  payloadStateForDescriptor,
} from "./x0130_nutrition.ts";
import { defaultRoot, joinPath } from "./x0140_paths.ts";
import {
  descriptorAddresses,
  descriptorNodeKeys,
  type DescriptorRecord,
  parseDescriptorFile,
  resolveFqdn,
  scanDescriptors,
  verifyPath,
} from "./x0150_descriptor_index.ts";
import {
  type GraphEdge,
  graphEdgeRecord,
  graphEdges,
  rebuildGraph,
  refKeys,
  verifyGraph,
} from "./x0160_graph.ts";
import { rebuildIndex, verifyProjections } from "./x0170_projections.ts";

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

export interface CaptureOptions {
  root?: string;
  text?: string;
  file?: string;
  actor?: string;
  kind?: string;
  visibility?: string;
  storePayload?: boolean;
  dryRun?: boolean;
  direction?: "forward" | "retrospective";
}

export interface CaptureResult {
  rawHash: string;
  shortHash: string;
  rawFqdn: string;
  intentFqdn: string;
  namingProofFqdn: string;
  artifactFqdn: string;
  artifactHash: string;
  transformationFqdns: string[];
  graphPath?: string;
  files: string[];
}

interface FunctionDescriptorResult {
  descriptor: MycDescriptor;
  hash: string;
  shortHash: string;
  path: string;
}

interface TransformationDescriptorResult {
  descriptor: MycDescriptor;
  path: string;
}

export interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
}

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

const TEXT_DECODER = new TextDecoder();
const MYC_VERSION = "0.1.0";

const FUNCTION_DEFINITIONS = {
  canonicalizer: {
    name: "myc.raw.bytes.sha256",
    version: "0.1.0",
    kind: "canonicalizer",
    determinism: "deterministic",
    rule:
      "UTF-8 bytes are hashed with SHA-256. No text normalization is applied.",
  },
  classifier: {
    name: "myc.intent.rules.classifier",
    version: "0.1.0",
    kind: "classifier",
    determinism: "deterministic",
    rule:
      "Rule-based text classifier for task/question/idea/message with conservative Ukrainian and English cues.",
  },
  namingPolicy: {
    name: "myc.fqdn.naming.policy",
    version: "0.1.0",
    kind: "naming-policy",
    determinism: "deterministic",
    rule:
      "Render artifact FQDN as <intent-kind>.<actor>.h.<raw-short>.myc.md using slugged labels.",
  },
} as const;

async function ensureDir(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
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

async function writeDescriptorFile(
  path: string,
  descriptor: MycDescriptor,
  title: string,
  note: string,
): Promise<void> {
  await ensureDir(dirname(path));
  const markdown = [
    "---",
    "chord:",
    chordLines(descriptor),
    "energy: 0.68",
    'mode: "PATCH"',
    `tension: "${descriptor.type.toLowerCase()}-generated"`,
    'confidence: "medium"',
    'receipt: "file"',
    "---",
    "",
    `# ${title}`,
    "",
    note,
    "",
    "```json myc",
    JSON.stringify(descriptor, null, 2),
    "```",
    "",
  ].join("\n");
  await Deno.writeTextFile(path, markdown);
}

function chordLines(descriptor: MycDescriptor): string {
  const primary = typeof descriptor.body.oct === "string"
    ? descriptor.body.oct
    : descriptor.type === "RawDescriptor"
    ? "oct:6.4"
    : descriptor.type === "FunctionDescriptor"
    ? "oct:5.1"
    : "oct:3.7";
  return `  primary: "${primary}"\n  secondary: ["oct:6.4", "oct:3.7"]`;
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  if (index <= 0) return "/";
  return path.slice(0, index);
}

async function functionDescriptor(
  root: string,
  key: keyof typeof FUNCTION_DEFINITIONS,
): Promise<FunctionDescriptorResult> {
  const definition = FUNCTION_DEFINITIONS[key];
  const body = {
    name: definition.name,
    version: definition.version,
    kind: definition.kind,
    determinism: definition.determinism,
    rule: definition.rule,
    inputs: ["input_commitment", "context_commitment", "params_commitment"],
    outputs: ["artifact_commitment", "receipt"],
  };
  const bodyHash = await sha256Hex(stableStringify(body));
  const shortHash = bodyHash.slice(0, 12);
  const fqdn = `h.${shortHash}.${slug(definition.name)}.function.myc.md`;
  const descriptor = await makeDescriptor(
    "FunctionDescriptor",
    "myc.function.v0.1",
    fqdn,
    body,
  );
  const path = joinPath(root, "public", "functions", fqdn);
  return { descriptor, hash: bodyHash, shortHash, path };
}

async function writeFunctionDescriptors(root: string): Promise<
  Record<keyof typeof FUNCTION_DEFINITIONS, FunctionDescriptorResult>
> {
  const result = {
    canonicalizer: await functionDescriptor(root, "canonicalizer"),
    classifier: await functionDescriptor(root, "classifier"),
    namingPolicy: await functionDescriptor(root, "namingPolicy"),
  };
  for (const descriptor of Object.values(result)) {
    await writeDescriptorFile(
      descriptor.path,
      descriptor.descriptor,
      descriptor.descriptor.fqdn,
      "Deterministic MYC function descriptor.",
    );
  }
  return result;
}

async function makeTransformationDescriptor(
  root: string,
  spec: {
    rawShort: string;
    actor: string;
    step: string;
    direction: "forward" | "retrospective";
    proofMode: "deterministic" | "witnessed" | "sealed";
    input: Record<string, Json>[];
    fn: FunctionDescriptorResult;
    contextCommitment: string;
    paramsCommitment: string;
    output: Record<string, Json>[];
    oct: string;
    note: string;
  },
): Promise<TransformationDescriptorResult> {
  const fqdn =
    `transform.${spec.direction}.${spec.step}.${spec.actor}.h.${spec.rawShort}.myc.md`;
  const body = {
    step: spec.step,
    direction: spec.direction,
    proof_mode: spec.proofMode,
    actor: spec.actor,
    input: spec.input,
    function: {
      fqdn: spec.fn.descriptor.fqdn,
      commitment: spec.fn.hash,
      determinism: spec.fn.descriptor.body.determinism ?? "unknown",
    },
    context_commitment: spec.contextCommitment,
    params_commitment: spec.paramsCommitment,
    output: spec.output,
    oct: spec.oct,
    note: spec.note,
    receipts: [] as Json[],
  };
  const descriptor = await makeDescriptor(
    "TransformationDescriptor",
    "myc.transform.v0.1",
    fqdn,
    body,
  );
  return {
    descriptor,
    path: joinPath(root, "public", "transforms", "h", spec.rawShort, fqdn),
  };
}

async function writeTransformationDescriptors(
  transforms: TransformationDescriptorResult[],
): Promise<void> {
  for (const transform of transforms) {
    await writeDescriptorFile(
      transform.path,
      transform.descriptor,
      transform.descriptor.fqdn,
      "First-class transformation edge. This file describes a verified knowledge transformation.",
    );
  }
}

export async function captureText(
  options: CaptureOptions,
): Promise<CaptureResult> {
  const root = options.root ?? defaultRoot();
  const actor = slug(options.actor ?? "unknown");
  const rawKind = slug(options.kind ?? "message");
  const visibility = options.visibility ?? "descriptor-public-payload-private";
  const storePayload = options.storePayload ?? true;
  const direction = options.direction ?? "forward";
  const rawText = await readInputText(options);
  // An empty thought addresses nothing: sha256("") is a degenerate identity that
  // pollutes the graph with a contentless artifact. A no-arg `capture` reads empty
  // stdin and silently ingests "" (the `e3b0c44…` footgun, found by dogfooding the
  // contribute path). Reject at the source so every afferent caller is protected;
  // the HTTP /propose passage already guards separately.
  if (rawText.trim() === "") {
    throw new Error(
      "capture: empty content — pipe text in, or pass --text <text> / --file <path>",
    );
  }
  const rawHash = await sha256Hex(rawText);
  const shortHash = rawHash.slice(0, 12);
  const objectDir = joinPath(root, "public", "objects", "h", shortHash);
  const rawFqdn = `h.${shortHash}.${rawKind}.${actor}.raw.myc.md`;
  const rawPath = joinPath(objectDir, rawFqdn);
  const privatePayloadPath = joinPath(
    root,
    "private",
    "payloads",
    `${rawHash}.txt`,
  );

  if (!options.dryRun && storePayload) {
    await ensureDir(dirname(privatePayloadPath));
    if (!(await exists(privatePayloadPath))) {
      await Deno.writeTextFile(privatePayloadPath, rawText);
    }
  }

  const functions = await writeFunctionDescriptors(root);
  const classification = classifyText(rawText);
  const contextCommitment = await sha256Hex(
    stableStringify({
      actor,
      visibility,
      payload_state: storePayload ? "private-local" : "known-but-unavailable",
    }),
  );
  const paramsCommitment = await sha256Hex(
    stableStringify({
      classifier: functions.classifier.descriptor.fqdn,
      naming_policy: functions.namingPolicy.descriptor.fqdn,
      raw_kind: rawKind,
    }),
  );
  const noneCommitment = await sha256Hex("none");

  const rawDescriptor = await makeDescriptor(
    "RawDescriptor",
    "myc.raw.v0.1",
    rawFqdn,
    {
      hash: rawHash,
      hash_short: shortHash,
      kind: rawKind,
      actor,
      visibility,
      oct: "oct:6.4",
      payload: {
        state: storePayload ? "private-local" : "known-but-unavailable",
        contains_payload: false,
        locator_hint: storePayload ? `myc-private-payload:${rawHash}` : "none",
        retention_policy: "do-not-copy-by-default",
      },
      note:
        "This descriptor commits to raw payload. It does not contain payload bytes.",
    },
  );

  const intentFqdn =
    `intent.${classification.kind}.${actor}.h.${shortHash}.myc.md`;
  const intentDescriptor = await makeDescriptor(
    "IntentDescriptor",
    "myc.intent.v0.2",
    intentFqdn,
    {
      intent: {
        id: intentFqdn,
        raw: rawFqdn,
        actor,
        kind: classification.kind,
        actionability: classification.actionability,
        language: "unknown",
      },
      address: {
        fqdn: intentFqdn,
        oct: classification.oct,
        local_path: null,
        cid: null,
      },
      context_chain: {
        session_id: "none",
        thread_id: "none",
        parent_ids: [],
        target_ids: [],
      },
      materialization: {
        requested: classification.actionability === "patch" ||
          classification.actionability === "publish",
        policy: "proposal",
        allowed_paths: [],
        forbidden_paths: [],
      },
      legacy_meta: {
        raw_hash: rawHash,
        confidence: classification.confidence,
        classifier: functions.classifier.descriptor.fqdn,
        signals: classification.signals,
      },
    },
  );

  const artifactFqdn = `${classification.kind}.${actor}.h.${shortHash}.myc.md`;
  const formulaInput = {
    function_hash: functions.namingPolicy.hash,
    input_commitment: rawHash,
    context_commitment: contextCommitment,
    params_commitment: paramsCommitment,
  };
  const artifactHash = await sha256Hex(stableStringify(formulaInput));
  const artifactShort = artifactHash.slice(0, 12);
  const immutableArtifactFqdn = `h.${artifactShort}.${artifactFqdn}`;
  const namingProofFqdn = `naming-proof.${actor}.h.${shortHash}.myc.md`;

  const namingProofDescriptor = await makeDescriptor(
    "NamingProofDescriptor",
    "myc.naming-proof.v0.1",
    namingProofFqdn,
    {
      input_commitment: rawHash,
      proof_mode: "deterministic",
      oct: "oct:6.4",
      chain: [
        {
          step: "canonicalize",
          function: functions.canonicalizer.descriptor.fqdn,
          params: "none",
          output: rawHash,
        },
        {
          step: "classify",
          function: functions.classifier.descriptor.fqdn,
          params: paramsCommitment,
          output: intentFqdn,
        },
        {
          step: "render_fqdn",
          function: functions.namingPolicy.descriptor.fqdn,
          params: paramsCommitment,
          output: artifactFqdn,
        },
      ],
      output: {
        fqdn: artifactFqdn,
        immutable_fqdn: immutableArtifactFqdn,
        artifact_hash: artifactHash,
      },
    },
  );

  const artifactDescriptor = await makeDescriptor(
    "ArtifactDescriptor",
    "myc.artifact.v0.1",
    artifactFqdn,
    {
      immutable_fqdn: immutableArtifactFqdn,
      relation: "intent-projection",
      target: rawFqdn,
      raw_hash: rawHash,
      artifact_hash: artifactHash,
      formula: {
        expression:
          "artifact = function_hash(input_commitment, context_commitment, params_commitment)",
        input: formulaInput,
      },
      proof_mode: "deterministic",
      payload_state: storePayload ? "private-local" : "known-but-unavailable",
      intent: intentFqdn,
      naming_proof: namingProofFqdn,
      oct: classification.oct,
      classification: classification as unknown as Json,
    },
  );

  const transformations = [
    await makeTransformationDescriptor(root, {
      rawShort: shortHash,
      actor,
      step: "canonicalize",
      direction,
      proofMode: "deterministic",
      input: [
        {
          role: "payload",
          commitment: rawHash,
          payload_state: storePayload
            ? "private-local"
            : "known-but-unavailable",
        },
      ],
      fn: functions.canonicalizer,
      contextCommitment: noneCommitment,
      paramsCommitment: noneCommitment,
      output: [
        {
          role: "raw",
          fqdn: rawFqdn,
          commitment: rawHash,
        },
      ],
      oct: "oct:6.4",
      note: "Hash raw payload bytes and produce a raw descriptor commitment.",
    }),
    await makeTransformationDescriptor(root, {
      rawShort: shortHash,
      actor,
      step: "classify",
      direction,
      proofMode: "deterministic",
      input: [
        {
          role: "raw",
          fqdn: rawFqdn,
          commitment: rawHash,
        },
      ],
      fn: functions.classifier,
      contextCommitment,
      paramsCommitment,
      output: [
        {
          role: "intent",
          fqdn: intentFqdn,
          commitment: intentDescriptor.commitment.value,
        },
      ],
      oct: classification.oct,
      note: "Classify raw descriptor into a conservative intent projection.",
    }),
    await makeTransformationDescriptor(root, {
      rawShort: shortHash,
      actor,
      step: "name",
      direction,
      proofMode: "deterministic",
      input: [
        {
          role: "intent",
          fqdn: intentFqdn,
          commitment: intentDescriptor.commitment.value,
        },
      ],
      fn: functions.namingPolicy,
      contextCommitment,
      paramsCommitment,
      output: [
        {
          role: "naming-proof",
          fqdn: namingProofFqdn,
          commitment: namingProofDescriptor.commitment.value,
        },
        {
          role: "artifact-address",
          fqdn: artifactFqdn,
          commitment: artifactHash,
        },
      ],
      oct: "oct:6.4",
      note: "Render a human-readable FQDN and record its naming proof.",
    }),
    await makeTransformationDescriptor(root, {
      rawShort: shortHash,
      actor,
      step: "project",
      direction,
      proofMode: "deterministic",
      input: [
        {
          role: "raw",
          fqdn: rawFqdn,
          commitment: rawHash,
        },
        {
          role: "intent",
          fqdn: intentFqdn,
          commitment: intentDescriptor.commitment.value,
        },
        {
          role: "naming-proof",
          fqdn: namingProofFqdn,
          commitment: namingProofDescriptor.commitment.value,
        },
      ],
      fn: functions.namingPolicy,
      contextCommitment,
      paramsCommitment,
      output: [
        {
          role: "artifact",
          fqdn: artifactFqdn,
          commitment: artifactDescriptor.commitment.value,
          artifact_hash: artifactHash,
        },
      ],
      oct: classification.oct,
      note:
        "Produce the final artifact descriptor from raw, intent, and naming proof.",
    }),
  ];

  const files = [
    rawPath,
    joinPath(objectDir, intentFqdn),
    joinPath(objectDir, namingProofFqdn),
    joinPath(objectDir, artifactFqdn),
    ...transformations.map((transform) => transform.path),
    ...Object.values(functions).map((fn) => fn.path),
  ];

  if (!options.dryRun) {
    await writeDescriptorFile(
      rawPath,
      rawDescriptor,
      rawFqdn,
      "Raw commitment descriptor. Payload bytes are not embedded here.",
    );
    await writeDescriptorFile(
      files[1],
      intentDescriptor,
      intentFqdn,
      "Deterministic intent classification descriptor.",
    );
    await writeDescriptorFile(
      files[2],
      namingProofDescriptor,
      namingProofFqdn,
      "Deterministic proof for the computed human-readable FQDN.",
    );
    await writeDescriptorFile(
      files[3],
      artifactDescriptor,
      artifactFqdn,
      "Produced projection descriptor.",
    );
    await writeTransformationDescriptors(transformations);
    await rebuildIndex(root);
  }

  return {
    rawHash,
    shortHash,
    rawFqdn,
    intentFqdn,
    namingProofFqdn,
    artifactFqdn,
    artifactHash,
    transformationFqdns: transformations.map((transform) =>
      transform.descriptor.fqdn
    ),
    graphPath: joinPath(root, "public", "graph.ndjson"),
    files,
  };
}

async function readInputText(options: CaptureOptions): Promise<string> {
  if (typeof options.text === "string") return options.text;
  if (options.file) return await Deno.readTextFile(options.file);
  const chunks: Uint8Array[] = [];
  for await (const chunk of Deno.stdin.readable) chunks.push(chunk);
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return TEXT_DECODER.decode(bytes);
}

export async function verifyRawPayload(
  root: string,
  descriptor: MycDescriptor,
): Promise<{ ok: boolean; errors: string[] }> {
  if (descriptor.type !== "RawDescriptor") {
    return { ok: true, errors: [] };
  }
  const rawHash = descriptor.body.hash;
  if (typeof rawHash !== "string") {
    return { ok: false, errors: ["Raw descriptor body.hash is missing"] };
  }
  const payloadPath = joinPath(root, "private", "payloads", `${rawHash}.txt`);
  if (!(await exists(payloadPath))) {
    return {
      ok: false,
      errors: [`Private payload is unavailable: ${payloadPath}`],
    };
  }
  const payload = await Deno.readTextFile(payloadPath);
  const actual = await sha256Hex(payload);
  if (actual !== rawHash) {
    return {
      ok: false,
      errors: [
        `Private payload hash mismatch: expected ${rawHash}, got ${actual}`,
      ],
    };
  }
  return { ok: true, errors: [] };
}

export interface PublishedRecord {
  fqdn?: string;
  path?: string;
  rawText?: string;
  descriptor?: {
    body: Json;
    commitment?: { algorithm?: string; covers?: string; value?: string };
  };
}

/** Fold KV-published records into the DURABLE git tree (audit A11). Records
 *  published to the live membrane live only in Cloudflare KV until reconciled;
 *  this writes each verified record's rawText to its committed path under public/
 *  so the content survives KV eviction. Forged records (commitment ≠ body) are
 *  REFUSED — durability must never fossilize a forgery. The caller rebakes the
 *  snapshot + commits; a record already on disk is skipped (idempotent). */
export async function reconcilePublished(
  root: string,
  records: PublishedRecord[],
): Promise<{ reconciled: string[]; skipped: string[]; rejected: string[] }> {
  const reconciled: string[] = [];
  const skipped: string[] = [];
  const rejected: string[] = [];
  for (const r of records) {
    if (!r.path || !r.rawText) {
      rejected.push(`${r.fqdn ?? "?"}: missing path/rawText`);
      continue;
    }
    const v = r.descriptor
      ? await verifyCommitment(r.descriptor)
      : { ok: false, errors: ["no descriptor"] };
    if (!v.ok) {
      rejected.push(`${r.fqdn ?? r.path}: ${v.errors.join("; ")}`);
      continue;
    }
    const abs = joinPath(root, r.path);
    if (await exists(abs)) {
      skipped.push(r.path);
      continue;
    }
    await ensureDir(dirname(abs));
    await Deno.writeTextFile(abs, r.rawText);
    reconciled.push(r.path);
  }
  if (reconciled.length > 0) await rebuildIndex(root);
  return { reconciled, skipped, rejected };
}

function compareStable(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
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
): Promise<{
  ok: boolean;
  target: string;
  path?: string;
  descriptor?: MycDescriptor;
  backward: GraphEdge[];
  forward: GraphEdge[];
  errors: string[];
}> {
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

function summarizeDescriptor(
  descriptor: MycDescriptor,
  lineage: Awaited<ReturnType<typeof lineageFor>>,
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

export async function reprojectRaw(
  root: string,
  rawTarget: string,
  options: { actor?: string; kind?: string } = {},
): Promise<CaptureResult> {
  const record = await resolveTargetRecord(root, rawTarget);
  if (!record) throw new Error(`Raw target not found: ${rawTarget}`);
  if (record.descriptor.type !== "RawDescriptor") {
    throw new Error(`Target is not a RawDescriptor: ${rawTarget}`);
  }
  const rawHash = record.descriptor.body.hash;
  if (typeof rawHash !== "string") {
    throw new Error(`Raw descriptor has no body.hash: ${rawTarget}`);
  }
  const payloadPath = joinPath(root, "private", "payloads", `${rawHash}.txt`);
  if (!(await exists(payloadPath))) {
    throw new Error(`Private payload unavailable: ${payloadPath}`);
  }
  const text = await Deno.readTextFile(payloadPath);
  const actor = options.actor ??
    (typeof record.descriptor.body.actor === "string"
      ? record.descriptor.body.actor
      : "unknown");
  const kind = options.kind ??
    (typeof record.descriptor.body.kind === "string"
      ? record.descriptor.body.kind
      : "message");
  return await captureText({
    root,
    text,
    actor,
    kind,
    storePayload: true,
    direction: "retrospective",
  });
}

export async function handleRequest(
  root: string,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // POST /propose — the afferent passage: a newcomer contributes a thought into
  // the local membrane, KEYLESS. Writes a content-addressed DORMANT proposal
  // (same safety invariant as the CLI `myc propose`); never signs/witnesses/
  // germinates. Composed by subprocess (x0100 stays import-free) + reindex.
  if (request.method === "POST" && url.pathname === "/propose") {
    let payload: { proposal?: unknown; requires?: unknown; proposer?: unknown };
    try {
      payload = await request.json();
    } catch {
      return errorResponse("invalid-json", 400, request);
    }
    const proposal = typeof payload.proposal === "string"
      ? payload.proposal.trim()
      : "";
    const requires = typeof payload.requires === "string"
      ? payload.requires
      : "";
    const proposer =
      typeof payload.proposer === "string" && payload.proposer.trim()
        ? payload.proposer.trim()
        : "anon";
    if (!proposal) {
      return errorResponse("proposal text is required", 400, request);
    }
    const propPath = new URL("./x5800_propose.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        propPath,
        "--root",
        root,
        "--text",
        proposal,
        "--requires",
        requires,
        "--actor",
        proposer,
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const { stdout } = await proc.output();
    const out = new TextDecoder().decode(stdout).trim();
    let result: Record<string, unknown> | null = null;
    try {
      result = JSON.parse(out);
    } catch { /* non-JSON output → fall through to 502 */ }
    if (result && typeof result.ok === "boolean") {
      if (result.ok) await rebuildIndex(root);
      return jsonResponse(result, result.ok ? 201 : 400, request);
    }
    return jsonResponse(
      { ok: false, error: out || "propose subprocess produced no result" },
      502,
      request,
    );
  }

  if (request.method !== "GET") {
    return errorResponse("method-not-allowed", 405, request);
  }

  if (url.pathname === "/health") {
    return jsonResponse(
      {
        ok: true,
        service: "myc-resolver",
        version: MYC_VERSION,
        root_state: "local-private",
      },
      200,
      request,
    );
  }

  if (url.pathname === "/index") {
    const includePaths = ["1", "true", "yes"].includes(
      (url.searchParams.get("paths") ?? "").toLowerCase(),
    );
    const records = await scanDescriptors(root);
    return jsonResponse(
      {
        ok: true,
        count: records.length,
        records: records.map((record) => indexRecord(record, includePaths)),
      },
      200,
      request,
    );
  }

  if (url.pathname === "/resolve") {
    const fqdn = url.searchParams.get("fqdn");
    if (!fqdn) {
      return errorResponse("missing-fqdn", 400, request);
    }
    const record = await resolveFqdn(root, fqdn);
    if (!record) {
      return errorResponse("not-found", 404, request, { fqdn });
    }
    return jsonResponse({ ok: true, ...record }, 200, request);
  }

  if (url.pathname === "/verify") {
    const target = url.searchParams.get("target");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const path = target.startsWith("/")
      ? target
      : (await resolveFqdn(root, target))?.path;
    if (!path) {
      return errorResponse("not-found", 404, request, { target });
    }
    const result = await verifyPath(path);
    const privateRequested = ["1", "true", "yes"].includes(
      (url.searchParams.get("private") ?? "").toLowerCase(),
    );
    const payload = privateRequested
      ? await verifyRawPayload(root, result.descriptor)
      : { ok: true, errors: [] };
    const ok = result.ok && payload.ok;
    return jsonResponse(
      {
        ok,
        path,
        fqdn: result.descriptor.fqdn,
        errors: [...result.errors, ...payload.errors],
      },
      ok ? 200 : 422,
      request,
    );
  }

  if (url.pathname === "/verify-graph") {
    const result = await verifyGraph(root);
    return jsonResponse(result, result.ok ? 200 : 422, request);
  }

  if (url.pathname === "/verify-projections") {
    const result = await verifyProjections(root);
    return jsonResponse(result, result.ok ? 200 : 422, request);
  }

  if (url.pathname === "/verification") {
    const receipts = await verificationReceipts(root);
    return jsonResponse(
      { ok: true, count: receipts.length, receipts },
      200,
      request,
    );
  }

  if (url.pathname === "/verification-source") {
    const name = url.searchParams.get("name");
    if (!name) {
      return errorResponse("missing-name", 400, request);
    }
    if (!/^[A-Za-z0-9._-]+\.md$/.test(name)) {
      return errorResponse("invalid-name", 400, request, { name });
    }
    const path = joinPath(root, "public", "verification", name);
    if (!(await exists(path))) {
      return errorResponse("not-found", 404, request, { name });
    }
    const source = await Deno.readTextFile(path);
    return jsonResponse({ ok: true, name, source }, 200, request);
  }

  if (url.pathname === "/graph") {
    const includePaths = ["1", "true", "yes"].includes(
      (url.searchParams.get("paths") ?? "").toLowerCase(),
    );
    const edges = await graphEdges(root);
    return jsonResponse(
      {
        ok: true,
        count: edges.length,
        edges: edges.map((edge) => graphEdgeRecord(edge, includePaths)),
      },
      200,
      request,
    );
  }

  if (url.pathname === "/lineage") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const lineage = await lineageFor(root, target);
    return jsonResponse(lineage, lineage.ok ? 200 : 404, request);
  }

  if (url.pathname === "/explain") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const explanation = await explainTarget(root, target);
    return jsonResponse(
      explanation,
      explanation.ok === false ? 404 : 200,
      request,
    );
  }

  if (url.pathname === "/version") {
    return jsonResponse({ ok: true, version: MYC_VERSION }, 200, request);
  }

  if (url.pathname === "/descriptor") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const record = await resolveFqdn(root, target);
    if (!record) {
      return errorResponse("not-found", 404, request, { target });
    }
    return jsonResponse(
      { ok: true, descriptor: record.descriptor },
      200,
      request,
    );
  }

  if (url.pathname === "/source") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const record = await resolveFqdn(root, target);
    if (!record) {
      return errorResponse("not-found", 404, request, { target });
    }
    const source = await Deno.readTextFile(record.path);
    return jsonResponse({ ok: true, source }, 200, request);
  }

  if (url.pathname === "/summary") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const record = await resolveFqdn(root, target);
    if (!record) {
      return errorResponse("not-found", 404, request, { target });
    }
    const lineage = await lineageFor(root, target);
    const summary = summarizeDescriptor(record.descriptor, lineage);
    return jsonResponse({ ok: true, summary }, 200, request);
  }

  if (url.pathname === "/nutrition") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const record = await resolveFqdn(root, target);
    if (!record) {
      return errorResponse("not-found", 404, request, { target });
    }
    return jsonResponse(
      {
        ok: true,
        target,
        nutrition: nutritionForDescriptor(record.descriptor),
      },
      200,
      request,
    );
  }

  if (url.pathname === "/availability") {
    const target = url.searchParams.get("target") ??
      url.searchParams.get("fqdn");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const availability = await explainAvailability(root, target);
    return jsonResponse(availability, availability.ok ? 200 : 404, request);
  }

  if (url.pathname === "/adapter-dry-run") {
    const adapter = url.searchParams.get("adapter");
    if (!adapter) {
      return errorResponse("missing-adapter", 400, request);
    }
    const result = await adapterDryRun(root, adapter);
    return jsonResponse(result, result.ok ? 200 : 404, request);
  }

  if (url.pathname === "/recipe-dry-run") {
    const target = url.searchParams.get("target");
    if (!target) {
      return errorResponse("missing-target", 400, request);
    }
    const result = await recipeDryRun(root, target);
    return jsonResponse(result, result.ok ? 200 : 404, request);
  }

  if (url.pathname === "/search") {
    const q = url.searchParams.get("q")?.toLowerCase();
    if (!q) {
      return errorResponse("missing-query", 400, request);
    }
    const records = await scanDescriptors(root);
    const results = records
      .filter((record) =>
        record.descriptor.fqdn.toLowerCase().includes(q) ||
        record.descriptor.commitment.value.toLowerCase().includes(q)
      )
      .map((record) => ({
        fqdn: record.descriptor.fqdn,
        type: record.descriptor.type,
        commitment: record.descriptor.commitment.value,
        aliases: descriptorAddresses(record.descriptor),
        nutrition: nutritionForDescriptor(record.descriptor) as unknown as Json,
      }));
    return jsonResponse(
      { ok: true, count: results.length, results },
      200,
      request,
    );
  }

  return errorResponse("not-found", 404, request, { path: url.pathname });
}

function indexRecord(
  record: DescriptorRecord,
  includePath: boolean,
): Record<string, Json> {
  return {
    ...(includePath ? { path: record.path } : {}),
    fqdn: record.descriptor.fqdn,
    type: record.descriptor.type,
    commitment: record.descriptor.commitment.value,
    aliases: descriptorAddresses(record.descriptor),
    nutrition: nutritionForDescriptor(record.descriptor) as unknown as Json,
  };
}

function errorResponse(
  code: string,
  status: number,
  request?: Request,
  details: Record<string, Json> = {},
): Response {
  return jsonResponse(
    {
      ok: false,
      error: code,
      message: errorMessage(code),
      ...details,
    },
    status,
    request,
  );
}

function errorMessage(code: string): string {
  const messages: Record<string, string> = {
    "method-not-allowed": "Only GET and OPTIONS are supported.",
    "missing-fqdn": "Required query parameter 'fqdn' is missing.",
    "missing-target": "Required query parameter 'target' or 'fqdn' is missing.",
    "missing-query": "Required query parameter 'q' is missing.",
    "missing-adapter": "Required query parameter 'adapter' is missing.",
    "missing-name": "Required query parameter 'name' is missing.",
    "invalid-name": "Receipt name must be a markdown file basename.",
    "not-found": "Requested MYC descriptor or route was not found.",
  };
  return messages[code] ?? code;
}

function jsonResponse(
  value: unknown,
  status = 200,
  request?: Request,
): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request),
    },
  });
}

function corsHeaders(request?: Request): HeadersInit {
  const origin = request?.headers.get("origin") ?? "";
  const allowOrigin = allowedOrigin(origin) ? origin : "null";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "origin",
  };
}

function allowedOrigin(origin: string): boolean {
  if (origin === "https://myc.md") return true;
  if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/\[::1\](?::\d+)?$/.test(origin)) return true;
  return origin === "";
}

export function auditEntry(
  request: Request,
  response: Response,
  durationMs: number,
  now = new Date(),
): AuditEntry {
  const url = new URL(request.url);
  return {
    timestamp: now.toISOString(),
    method: request.method,
    path: url.pathname,
    status: response.status,
    duration_ms: Math.round(durationMs),
  };
}

export function formatAuditEntry(entry: AuditEntry): string {
  return `[audit] ${entry.timestamp} | ${entry.method} ${entry.path} ${entry.status} ${entry.duration_ms}ms`;
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

export async function publishTarget(
  root: string,
  target: string,
  // Optional thread to the apply-receipt this publication derives from
  // (a SPORE spore_id / liquid intent_hash). Closes the lifecycle's
  // apply→published gap — the mutation x5800-proposed (h.9068b4888a6f).
  derivedFrom?: string,
): Promise<{
  ok: boolean;
  fqdn: string;
  path?: string;
  errors: string[];
}> {
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
    const r = await resolveTargetRecord(root, fqdn);
    if (!r) return;

    const clone = JSON.parse(JSON.stringify(r.descriptor));

    // Redact payload if private
    if (clone.body.payload_policy === "private" && clone.body.payload) {
      delete clone.body.payload;
    }

    // Redact local paths in IntentDescriptor
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
        naming_proof_verified: true, // We assume true if it's in the graph
        graph_verified: true,
        payload_scrubbed: true,
      },
      destinations: [],
      // present only when supplied → keeps the commitment of older publishes stable
      ...(derivedFrom ? { derived_from: derivedFrom } : {}),
    },
  };

  publishDescriptor.commitment.value = await sha256Hex(
    stableStringify(
      publishDescriptor.body as unknown as Json,
    ),
  );

  descriptorsToPublish.set(publishFqdn, publishDescriptor);

  const exportLines = Array.from(descriptorsToPublish.values()).map((d) =>
    stableStringify(d as unknown as Json)
  );

  await ensureDir(joinPath(root, "public", "exports"));
  const exportPath = joinPath(
    root,
    "public",
    "exports",
    `${record.descriptor.fqdn}.export.ndjson`,
  );
  await Deno.writeTextFile(exportPath, exportLines.join("\n") + "\n");

  // The PublishDescriptor must also live in the graph as a resolvable node —
  // the export ndjson alone leaves it invisible to resolveFqdn, which made
  // `witness` (whose target must BE a PublishDescriptor) unsatisfiable for
  // every publication. Mirror the witness layout under public/consensus/.
  // Deterministic body (no timestamp) → republishing the same bytes rewrites
  // the same file, so this stays idempotent.
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
): Promise<{
  ok: boolean;
  imported: number;
  errors: string[];
}> {
  let content: string;
  try {
    content = await Deno.readTextFile(path);
  } catch (e) {
    return { ok: false, imported: 0, errors: [`failed to read file: ${e}`] };
  }

  const lines = content.split("\n").filter(Boolean);
  const descriptors: MycDescriptor[] = [];

  for (const line of lines) {
    try {
      descriptors.push(JSON.parse(line));
    } catch (e) {
      return {
        ok: false,
        imported: 0,
        errors: [`failed to parse json line: ${e}`],
      };
    }
  }

  const errors: string[] = [];
  let importedCount = 0;

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

    // We infer the short hash from the fqdn: h.<hash>....
    const shortHashMatch = descriptor.fqdn.match(/(?:^|\.)h\.([0-9a-f]+)\./);
    if (!shortHashMatch) {
      errors.push(`invalid fqdn format: ${descriptor.fqdn}`);
      continue;
    }
    const shortHash = shortHashMatch[1];

    let writePath: string;
    if (descriptor.type === "FunctionDescriptor") {
      writePath = joinPath(root, "public", targetDir, descriptor.fqdn);
    } else {
      writePath = joinPath(
        root,
        "public",
        targetDir,
        "h",
        shortHash,
        descriptor.fqdn,
      );
    }

    const exists = await Deno.stat(writePath).then(() => true).catch(() =>
      false
    );
    if (!exists) {
      await writeDescriptorFile(
        writePath,
        descriptor,
        `Imported ${descriptor.type}`,
        "Imported from external graph bundle.",
      );
      importedCount++;
    }
  }

  if (errors.length > 0) {
    return { ok: false, imported: importedCount, errors };
  }

  await rebuildIndex(root);
  const syncResult = await verifyProjections(root);
  if (!syncResult.ok) {
    return {
      ok: false,
      imported: importedCount,
      errors: ["projections sync failed", ...syncResult.errors],
    };
  }

  return { ok: true, imported: importedCount, errors: [] };
}

export async function witnessTarget(
  root: string,
  target: string,
  actor: string,
): Promise<{ ok: boolean; fqdn?: string; path?: string; errors: string[] }> {
  const record = await resolveFqdn(root, target);
  if (!record) return { ok: false, errors: [`target not found: ${target}`] };
  if (record.descriptor.type !== "PublishDescriptor") {
    // Friction found walking the loop as a user: the instinct is to witness the
    // proposal directly, but a witness targets the PUBLISH. Guide, don't just deny.
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

  const witnessDescriptor: MycDescriptor = {
    type: "WitnessDescriptor",
    schema_version: "myc.witness.v0.1",
    fqdn: "",
    commitment: {
      algorithm: "sha256",
      value: "",
      covers: "descriptor.body",
    },
    body: {
      target_fqdn: record.descriptor.fqdn,
      target_commitment: record.descriptor.commitment.value,
      witness_actor: actor,
      timestamp: new Date().toISOString(),
      verification_status: "structurally_valid",
    },
  };

  const bodyString = stableStringify(witnessDescriptor.body as unknown as Json);
  witnessDescriptor.commitment.value = await sha256Hex(bodyString);

  const shortHash = witnessDescriptor.commitment.value.slice(0, 12);
  witnessDescriptor.fqdn = `h.${shortHash}.witness.myc.md`;

  const writePath = joinPath(
    root,
    "public",
    "consensus",
    "witness",
    "h",
    shortHash,
    witnessDescriptor.fqdn,
  );
  await ensureDir(dirname(writePath));
  await writeDescriptorFile(
    writePath,
    witnessDescriptor,
    "Witness Descriptor",
    "Generated locally to prove receipt and structural validity.",
  );

  await rebuildIndex(root);

  return {
    ok: true,
    fqdn: witnessDescriptor.fqdn,
    path: writePath,
    errors: [],
  };
}

export async function reviewTarget(
  root: string,
  target: string,
  reviewer: string,
  rating: string,
  comment?: string,
): Promise<{ ok: boolean; fqdn?: string; path?: string; errors: string[] }> {
  if (!["approve", "reject", "neutral"].includes(rating)) {
    return {
      ok: false,
      errors: [`rating must be approve, reject, or neutral`],
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

  const reviewDescriptor: MycDescriptor = {
    type: "ReviewDescriptor",
    schema_version: "myc.review.v0.1",
    fqdn: "",
    commitment: {
      algorithm: "sha256",
      value: "",
      covers: "descriptor.body",
    },
    body: {
      target_fqdn: record.descriptor.fqdn,
      target_commitment: record.descriptor.commitment.value,
      reviewer,
      rating,
      ...(comment ? { comment } : {}),
      timestamp: new Date().toISOString(),
    },
  };

  const bodyString = stableStringify(reviewDescriptor.body as unknown as Json);
  reviewDescriptor.commitment.value = await sha256Hex(bodyString);

  const shortHash = reviewDescriptor.commitment.value.slice(0, 12);
  reviewDescriptor.fqdn = `h.${shortHash}.review.myc.md`;

  const writePath = joinPath(
    root,
    "public",
    "consensus",
    "review",
    "h",
    shortHash,
    reviewDescriptor.fqdn,
  );
  await ensureDir(dirname(writePath));
  await writeDescriptorFile(
    writePath,
    reviewDescriptor,
    "Review Descriptor",
    `Semantic evaluation: ${rating}`,
  );

  await rebuildIndex(root);

  return { ok: true, fqdn: reviewDescriptor.fqdn, path: writePath, errors: [] };
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

function parseArgs(
  args: string[],
): {
  command: string;
  flags: Record<string, string | boolean>;
  rest: string[];
} {
  const [command = "help", ...tail] = args;
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let index = 0; index < tail.length; index++) {
    const arg = tail[index];
    if (!arg.startsWith("--")) {
      rest.push(arg);
      continue;
    }
    const trimmed = arg.slice(2);
    const eq = trimmed.indexOf("=");
    if (eq >= 0) {
      flags[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
      continue;
    }
    const next = tail[index + 1];
    if (next && !next.startsWith("--")) {
      flags[trimmed] = next;
      index++;
    } else {
      flags[trimmed] = true;
    }
  }
  return { command, flags, rest };
}

function flagString(
  flags: Record<string, string | boolean>,
  name: string,
): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function flagBoolean(
  flags: Record<string, string | boolean>,
  name: string,
  defaultValue: boolean,
): boolean {
  const value = flags[name];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return !["0", "false", "no"].includes(value.toLowerCase());
  }
  return defaultValue;
}

/** Human-friendly capture summary (the TTY default). `t myc capture` is the
 *  newcomer's CONTRIBUTE doorway; a person should see what happened and what it
 *  means — not a wall of hashes. Raw JSON is still emitted with --json or when
 *  piped (scripts/callers). Dogfood 2026-07-01. */
export function renderCaptureHuman(r: CaptureResult): string {
  return [
    "✓ your thought is in the network — keyless and content-addressed.",
    "",
    `  address:  ${r.rawFqdn}`,
    `  content:  ${r.artifactFqdn}`,
    `  hash:     ${r.rawHash}`,
    "",
    "  Its identity IS its hash — anyone can verify it by that hash. It carries NO",
    "  trust yet: a voice must witness it to give it standing (open contribution,",
    "  earned trust). Run again with --json for the full descriptor + transform set.",
  ].join("\n");
}

export async function main(args: string[]): Promise<void> {
  // `coord <coordinate> [--graph|--lattice|--why|--stamp <signer>|--cat|--json]`
  // reaches the coordinate/provenance resolver (x0200_resolve.ts) through this
  // one CLI, so `myc` now spans BOTH address families: descriptor FQDNs (the
  // `resolve` command below — `task.actor.h.<hash>`) and graph coordinates
  // (`coord` — `xNNNN_handle`). x0200 owns the git+crypto proof modes and needs
  // --allow-run for git, so we shell it (matching the dispatcher-shells-organs
  // idiom) rather than import across the x01→x02 direction. Handled before
  // parseArgs so x0200's own flags pass through untouched.
  if (args[0] === "coord") {
    const resolverPath =
      new URL("./x0200_resolve.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-run",
        "--allow-env",
        resolverPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `organism` / `membrane` — the membrane self-portrait: the four substrates
  // as one proof-carrying body (LAW/omega · FIELD/liquid · MIND/trinity ·
  // MYCELIUM/myc), their proof-kinds, the four roots of trust, and the spores
  // germinated across substrate boundaries. Shelled (like `coord`) to keep
  // x0100 lean; TTY-aware (a readable body for humans, JSON for models).
  if (args[0] === "organism") {
    const organismPath =
      new URL("./x8F00_organism.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", organismPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `membrane` — the single surface: the body + its trust + its mutations'
  // lives, composed into one read-only view (the architect's founding vision).
  // `overview` is an alias — install.sh advertised it as the browse-the-network
  // path, but it was not a command (a newcomer got the raw help list). Dogfood.
  if (args[0] === "membrane" || args[0] === "overview") {
    const memPath = new URL("./x8FF0_membrane.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", memPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `trust` — trust topology / resonance ranking (ROADMAP Phase 9). Reads the
  // publish/witness/review consensus graph and surfaces a subjective resonance
  // signal per published mutation. Shelled (like organism/coord) to keep x0100
  // lean; TTY-aware.
  if (args[0] === "trust" || args[0] === "resonance") {
    const trustPath = new URL("./x3700_trust.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", trustPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `standing` — the temporal standing of signed descriptors (v0 current_registry_only
  // vs v1 historically verifiable). Makes the Temporal Trust Envelope verifier live.
  if (args[0] === "standing") {
    const sp =
      new URL("./x2F60_temporal_envelope.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", sp, ...args],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `temporal-sign` — emit a v1 Temporal Signature Envelope with the actor's OWN
  // key (codex P3 step 1). Outputs subject_for_ots for the architect's anchor
  // ceremony. Needs the private key (--allow-read + --allow-env HOME).
  if (args[0] === "temporal-verify") {
    const sp = new URL("./x2FA0_temporal_verify.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-run",
        "--allow-env",
        sp,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  if (args[0] === "temporal-sign") {
    const sp = new URL("./x2F90_temporal_sign.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-env",
        `--allow-write=${
          new URL("../public/temporal", import.meta.url).pathname
        }`,
        sp,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `ots-verify` — read/verify an OpenTimestamps proof through the authoritative
  // `ots` tool (codex P2). Embedded attestations via `ots info`; --verify runs the
  // on-chain check (unavailable without a Bitcoin source). Needs --allow-run.
  if (args[0] === "ots-verify") {
    const sp = new URL("./x2F80_ots_adapter.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", "--allow-run", sp, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `lifecycle` — the canonical mutation lifecycle (T3): one vocabulary across
  // apply-receipts (applied) and the consensus graph. Read-only; shelled.
  if (args[0] === "lifecycle") {
    const lifePath = new URL("./x3F00_lifecycle.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", lifePath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `propose` — propose a mutation INTO the membrane (the efferent half, dormant
  // slice). Writes a content-addressed, UNSIGNED, DORMANT ProposedMutationDescriptor
  // under public/proposals/. Effect class (writes); never signs/germinates.
  if (args[0] === "propose") {
    const propPath = new URL("./x5800_propose.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        propPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) {
      Deno.exitCode = code;
    } else {
      // keep public/index.ndjson in sync (as publish/witness/review do) so the
      // dormant proposal is indexed + resolvable and verify-projections stays green.
      await rebuildIndex(defaultRoot());
    }
    return;
  }

  // `petition` — external PETITION intake (codex x5000_956709 / claude x3300_956707):
  // a non-citizen agent's SIGNED, reference-mode submission that lands as a DORMANT
  // proposal (reusing propose). Verifies the Ed25519 envelope; never fetches; grants
  // nothing until witnessed. Effect class (writes).
  if (args[0] === "petition") {
    const petPath = new URL("./x5850_petition.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        petPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) {
      Deno.exitCode = code;
    } else {
      await rebuildIndex(defaultRoot());
    }
    return;
  }

  // `verify-deployment [url]` — Resonant Resolution step 1: verify a deployed
  // myc.md fallback serves ONLY what local source attests, by content hash
  // (trust the hash, not the host). Read-only; network. (chord x6000_954726)
  if (args[0] === "verify-deployment") {
    const vPath =
      new URL("../sites/myc.md/verify_deployment.ts", import.meta.url)
        .pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-net", "--allow-read", vPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `snapshot [--write path]` — Resonant Resolution: build a portable,
  // content-addressed export of the public network (index + descriptors + raw
  // source) — the content a fallback would serve + peers would exchange.
  // Read-only unless --write. (chord x6000_954726)
  if (args[0] === "snapshot") {
    const sPath =
      new URL("../sites/myc.md/snapshot.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        sPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `verify-snapshot <file>` — Resonant Resolution: verify a snapshot (e.g. one
  // received from a peer) with myc's canonical verifier — trust the hash, not the
  // host. Rehydrates to a temp root + verifyPath per record. Read-only to your tree.
  // (chord x6000_954726)
  if (args[0] === "verify-snapshot") {
    const vsPath =
      new URL("../sites/myc.md/verify_snapshot.ts", import.meta.url)
        .pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-net",
        vsPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `publish --witness <voice> --content <hash>` — witness→publish: a keyed voice
  // signs captured content and posts it to the membrane's /publish, so strangers
  // resolve it on myc.md with NO CF creds and NO maintainer deploy. Pre-verifies
  // every record with the canonical verifier before publishing.
  if (args[0] === "publish") {
    const pPath =
      new URL("../sites/myc.md/publish.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-run",
        "--allow-net",
        "--allow-env",
        pPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `import-snapshot <file> [--write]` — Resonant Resolution: receive a peer's
  // network export, verify it by hash, and merge the NEW verified records into your
  // local network. Dry-run unless --write; never overwrites; conflicts reported.
  // (chord x6000_954726)
  if (args[0] === "import-snapshot") {
    const isPath =
      new URL("../sites/myc.md/import_snapshot.ts", import.meta.url)
        .pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        "--allow-net",
        isPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `resolve-proposal` — record a terminal, commitment-bound outcome for a
  // dormant proposal (codex x6300_954228 P1). Effect class; rebuilds the index.
  if (args[0] === "resolve-proposal") {
    const resPath = new URL("./x5810_resolve_proposal.ts", import.meta.url)
      .pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        resPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    else await rebuildIndex(defaultRoot());
    return;
  }

  // `authenticate` — add a voice content_sig to a descriptor (witness), lifting
  // it from integrity to authenticity. Writes (frontmatter only; commitment
  // stable). Effect class; needs the user-level voice key.
  if (args[0] === "authenticate") {
    const authPath = new URL("./x2F50_voice_auth.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        authPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `render` — the membrane as a self-contained HTML page (for human eyes).
  // Read-only; HTML to stdout (redirect to a file, open in any browser).
  if (args[0] === "render") {
    const renderPath = new URL("./x8FE0_render.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", renderPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `effects` — the typed effect of every myc verb (the capability boundary,
  // mirrored by trinity's t myc passthrough). Read-only; shelled.
  if (args[0] === "effects") {
    const fxPath = new URL("./x4A10_verb_effects.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", fxPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  const { command, flags, rest } = parseArgs(args);
  const root = flagString(flags, "root") ?? defaultRoot();

  if (command === "capture") {
    const result = await captureText({
      root,
      text: flagString(flags, "text"),
      file: flagString(flags, "file"),
      actor: flagString(flags, "actor") ?? "s0fractal",
      kind: flagString(flags, "kind") ?? "message",
      visibility: flagString(flags, "visibility"),
      storePayload: flagBoolean(flags, "store-payload", true),
      dryRun: flagBoolean(flags, "dry-run", false),
    });
    const wantJson = flagBoolean(flags, "json", false) ||
      !Deno.stdout.isTerminal();
    console.log(
      wantJson ? JSON.stringify(result, null, 2) : renderCaptureHuman(result),
    );
    return;
  }

  if (command === "resolve") {
    const fqdn = rest[0];
    if (!fqdn) throw new Error("resolve requires an FQDN");
    const record = await resolveFqdn(root, fqdn);
    if (!record) {
      console.log(
        JSON.stringify({ ok: false, error: "not-found", fqdn }, null, 2),
      );
      Deno.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ ok: true, ...record }, null, 2));
    return;
  }

  if (command === "verify") {
    const target = rest[0];
    if (!target) throw new Error("verify requires a path or FQDN");
    const path = target.startsWith("/")
      ? target
      : (await resolveFqdn(root, target))?.path;
    if (!path) {
      console.log(
        JSON.stringify({ ok: false, error: "not-found", target }, null, 2),
      );
      Deno.exitCode = 1;
      return;
    }
    const result = await verifyPath(path);
    const payload = flagBoolean(flags, "with-private", false)
      ? await verifyRawPayload(root, result.descriptor)
      : { ok: true, errors: [] };
    const ok = result.ok && payload.ok;
    console.log(JSON.stringify(
      {
        ok,
        path,
        fqdn: result.descriptor.fqdn,
        errors: [...result.errors, ...payload.errors],
      },
      null,
      2,
    ));
    if (!ok) Deno.exitCode = 1;
    return;
  }

  if (command === "verify-graph") {
    const result = await verifyGraph(root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "verify-projections") {
    const result = await verifyProjections(root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "index") {
    const path = await rebuildIndex(root);
    console.log(JSON.stringify({ ok: true, path }, null, 2));
    return;
  }

  // `reconcile-published [--source=URL|FILE]` (audit A11) — fold the live
  // membrane's KV-published records into the DURABLE git tree so they survive KV
  // eviction. Verifies each record's commitment (a forgery is refused, never
  // fossilized). Default source is the live /published endpoint.
  if (command === "reconcile-published") {
    const source = (flags.source as string) ?? "https://myc.md/published";
    const text = source.startsWith("http")
      ? await (await fetch(source)).text()
      : await Deno.readTextFile(source);
    const records = JSON.parse(text);
    if (!Array.isArray(records)) {
      throw new Error(
        "reconcile-published: source must be a JSON array of published records",
      );
    }
    const result = await reconcilePublished(root, records);
    console.log(JSON.stringify(
      {
        ok: result.rejected.length === 0,
        source,
        ...result,
        next: result.reconciled.length > 0
          ? "content is now in public/ (durable); run `deno task snapshot:publish` + commit to serve it from the baked snapshot"
          : "nothing new to reconcile",
      },
      null,
      2,
    ));
    if (result.rejected.length > 0) Deno.exitCode = 1;
    return;
  }

  if (command === "graph") {
    const path = await rebuildGraph(root);
    console.log(JSON.stringify({ ok: true, path }, null, 2));
    return;
  }

  if (command === "lineage") {
    const target = rest[0];
    if (!target) throw new Error("lineage requires a path or FQDN");
    const lineage = await lineageFor(root, target);
    console.log(JSON.stringify(lineage, null, 2));
    if (!lineage.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "explain") {
    const target = rest[0];
    if (!target) throw new Error("explain requires a path or FQDN");
    const explanation = await explainTarget(root, target);
    console.log(JSON.stringify(explanation, null, 2));
    if (explanation.ok === false) Deno.exitCode = 1;
    return;
  }

  if (command === "reproject") {
    const target = rest[0];
    if (!target) throw new Error("reproject requires a RawDescriptor FQDN");
    const result = await reprojectRaw(root, target, {
      actor: flagString(flags, "actor"),
      kind: flagString(flags, "kind"),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "adapter-dry-run") {
    const adapter = rest[0];
    if (!adapter) throw new Error("adapter-dry-run requires an adapter name");
    const result = await adapterDryRun(root, adapter);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "dry-run") {
    const target = rest[0];
    if (!target) throw new Error("dry-run requires a recipe fqdn");
    const result = await recipeDryRun(root, target);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "publish") {
    const target = rest[0];
    if (!target) throw new Error("publish requires a fqdn");
    // --derived-from <apply-id>: thread this publication to its SPORE/phase
    // apply receipt so the lifecycle reads end-to-end (x5800 proposal).
    const result = await publishTarget(
      root,
      target,
      flagString(flags, "derived-from"),
    );
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "import") {
    const path = rest[0];
    if (!path) throw new Error("import requires a file path");
    const result = await importGraph(root, path);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "witness") {
    const target = rest[0];
    if (!target) {
      throw new Error("witness requires a target PublishDescriptor fqdn");
    }
    const actor = flagString(flags, "actor") ?? "s0fractal";
    const result = await witnessTarget(root, target, actor);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "review") {
    const target = rest[0];
    const rating = rest[1];
    const comment = rest[2];
    if (!target || !rating) {
      throw new Error(
        "review requires a target fqdn and a rating (approve|reject|neutral)",
      );
    }
    const reviewer = flagString(flags, "reviewer") ?? "s0fractal";
    const result = await reviewTarget(root, target, reviewer, rating, comment);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "availability") {
    const target = rest[0];
    if (!target) throw new Error("availability requires a path or FQDN");
    const result = await explainAvailability(root, target);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "serve") {
    const port = Number(flagString(flags, "port") ?? "8787");
    const hostname = flagString(flags, "host") ?? "127.0.0.1";
    console.log(JSON.stringify({ ok: true, root, hostname, port }, null, 2));
    Deno.serve({ hostname, port }, async (request) => {
      const start = performance.now();
      const response = await handleRequest(root, request);
      const entry = auditEntry(request, response, performance.now() - start);
      console.log(formatAuditEntry(entry));
      return response;
    });
    return;
  }

  if (command === "demo") {
    const result = await captureText({
      root,
      text:
        "зроби маленький deterministic myc demo: raw -> descriptor -> naming proof -> artifact",
      actor: "s0fractal",
      kind: "message",
      storePayload: true,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(helpText());
}

function helpText(): string {
  return [
    "MYC local-first descriptor CLI",
    "",
    "Commands:",
    "  capture --text <text> [--actor s0fractal] [--kind message]",
    "  capture --file <path> [--actor s0fractal] [--kind message]",
    "  resolve <fqdn>                       (descriptor FQDN → descriptor)",
    "  coord <xNNNN_handle> [--graph|--lattice|--why|--stamp <signer>|--cat]",
    "                                       (graph coordinate → git+crypto proof)",
    "  membrane                             (THE single surface — body+trust+life)",
    "  organism                             (the four substrates as one body)",
    "  trust                                (resonance over published mutations)",
    "  lifecycle                            (one vocabulary for a mutation's life)",
    "  effects                              (the typed capability of each verb)",
    "  render                               (the membrane as HTML — for human eyes)",
    "  propose --text <t> --requires <omega|liquid|trinity|spore> [--actor a]",
    "                                       (propose a DORMANT mutation; writes)",
    "  verify-deployment [url]              (verify a deployed myc.md serves only",
    "                                        local-source bytes — trust the hash)",
    "  snapshot [--write path]              (portable content-addressed export of",
    "                                        the public network — fallback/peer feed)",
    "  verify-snapshot <file|url>           (verify a peer's snapshot by hash with",
    "                                        myc's canonical verifier — trust the hash)",
    "  import-snapshot <file|url> [--write] (verify then merge a peer's new records",
    "                                        into your network; dry-run by default)",
    "  authenticate <descriptor> [--voice claude]",
    "                                       (sign a witness — integrity → authenticity)",
    "  resolve-proposal <proposal> --outcome <implemented|rejected|…>",
    "       --from-receipt <path> (derives the ref from the proof) | --evidence-ref <k:r:c>",
    "       [--actor a]   then `authenticate`  (a CLAIM; final only when authenticated)",
    "  verify <path-or-fqdn> [--with-private]",
    "  verify-graph",
    "  verify-projections",
    "  index",
    "  graph",
    "  lineage <path-or-fqdn>",
    "  explain <path-or-fqdn>",
    "  availability <path-or-fqdn>",
    "  reproject <raw-fqdn> [--actor s0fractal] [--kind message]",
    "  adapter-dry-run <adapter-name>",
    "  dry-run <recipe-fqdn>",
    "  publish <fqdn>",
    "  import <path>",
    "  witness <fqdn> [--actor s0fractal]",
    "  review <fqdn> <rating> [comment] [--reviewer s0fractal]",
    "  serve [--host 127.0.0.1] [--port 8787]",
    "  demo",
    "",
    "Environment:",
    "  MYC_ROOT=~/trinity/myc   (mycelium install; falls back to ~/myc standalone,",
    "                            or the repo root when run inside it)",
  ].join("\n");
}

if (import.meta.main) {
  main(Deno.args).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  });
}
