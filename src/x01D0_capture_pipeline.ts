// Capture, reproject, private-payload verification, and durable reconciliation.

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
import { defaultRoot, joinPath } from "./x0140_paths.ts";
import { rebuildIndex } from "./x0170_projections.ts";
import { resolveTargetRecord } from "./x0180_lineage.ts";
import { writeDescriptorFile } from "./x01B0_descriptor_store.ts";

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

const TEXT_DECODER = new TextDecoder();

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
