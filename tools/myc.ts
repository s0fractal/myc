type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export interface MycDescriptor {
  type: string;
  schema_version: string;
  fqdn: string;
  commitment: {
    algorithm: "sha256";
    value: string;
    covers: "descriptor.body";
  };
  body: Record<string, Json>;
}

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

interface Classification {
  kind: string;
  actionability: string;
  oct: string;
  confidence: "low" | "medium" | "high";
  signals: string[];
}

interface TransformationDescriptorResult {
  descriptor: MycDescriptor;
  path: string;
}

interface GraphEdge {
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

interface DescriptorRecord {
  path: string;
  descriptor: MycDescriptor;
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

export interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
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

export interface NutritionLabel {
  status: string;
  labels: string[];
  proof_mode: string;
  payload_state: string;
  freshness: string;
  reasons: string[];
}

const TEXT_ENCODER = new TextEncoder();
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

export function defaultRoot(): string {
  const envRoot = Deno.env.get("MYC_ROOT");
  if (envRoot) return envRoot;
  const cwd = Deno.cwd();
  try {
    const config = Deno.statSync(joinPath(cwd, "deno.jsonc"));
    const tools = Deno.statSync(joinPath(cwd, "tools", "myc.ts"));
    if (config.isFile && tools.isFile) return cwd;
  } catch {
    // Fall back to the local operator convention below.
  }
  const home = Deno.env.get("HOME") ?? "/Users/s0fractal";
  return joinPath(home, "myc");
}

export function joinPath(...parts: string[]): string {
  const filtered = parts.filter((part) => part.length > 0);
  if (filtered.length === 0) return ".";
  const first = filtered[0];
  const absolute = first.startsWith("/");
  const normalized = filtered
    .map((part, index) => {
      if (index === 0) return part.replace(/\/+$/g, "");
      return part.replace(/^\/+|\/+$/g, "");
    })
    .filter((part) => part.length > 0)
    .join("/");
  return absolute ? `/${normalized.replace(/^\/+/, "")}` : normalized;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? TEXT_ENCODER.encode(input) : input;
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function stableStringify(value: Json): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${
    keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")
  }}`;
}

export function slug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized.length > 0 ? normalized : "unknown";
}

export function classifyText(text: string): Classification {
  const lower = text.toLowerCase();
  const signals: string[] = [];
  const taskCues = [
    "зроб",
    "напиши",
    "реаліз",
    "створи",
    "створ",
    "доповн",
    "онов",
    "поправ",
    "виправ",
    "додай",
    "запусти",
    "перевір",
    "implement",
    "write",
    "create",
    "make",
    "fix",
    "add",
    "update",
    "run",
    "verify",
  ];
  const ideaCues = [
    "ідея",
    "уяви",
    "може",
    "концеп",
    "protocol",
    "vision",
    "idea",
    "imagine",
  ];
  const questionCues = [
    "?",
    "чи ",
    "як ",
    "що ",
    "чому ",
    "how ",
    "what ",
    "why ",
  ];

  for (const cue of taskCues) {
    if (lower.includes(cue)) signals.push(`task:${cue}`);
  }
  for (const cue of ideaCues) {
    if (lower.includes(cue)) signals.push(`idea:${cue}`);
  }
  for (const cue of questionCues) {
    if (lower.includes(cue)) signals.push(`question:${cue.trim() || "?"}`);
  }

  if (signals.some((signal) => signal.startsWith("task:"))) {
    return {
      kind: "task",
      actionability: "patch",
      oct: "oct:5.1",
      confidence: "medium",
      signals,
    };
  }

  if (signals.some((signal) => signal.startsWith("question:"))) {
    return {
      kind: "question",
      actionability: "discuss",
      oct: "oct:2.3",
      confidence: "medium",
      signals,
    };
  }

  if (signals.some((signal) => signal.startsWith("idea:"))) {
    return {
      kind: "idea",
      actionability: "design",
      oct: "oct:7.2",
      confidence: "low",
      signals,
    };
  }

  return {
    kind: "message",
    actionability: "discuss",
    oct: "oct:3.7",
    confidence: "low",
    signals,
  };
}

export async function makeDescriptor(
  type: string,
  schemaVersion: string,
  fqdn: string,
  body: Record<string, Json>,
): Promise<MycDescriptor> {
  const value = await sha256Hex(stableStringify(body));
  return {
    type,
    schema_version: schemaVersion,
    fqdn,
    commitment: {
      algorithm: "sha256",
      value,
      covers: "descriptor.body",
    },
    body,
  };
}

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
    "myc.intent.v0.1",
    intentFqdn,
    {
      raw: rawFqdn,
      raw_hash: rawHash,
      actor,
      input_kind: rawKind,
      intent_kind: classification.kind,
      actionability: classification.actionability,
      oct: classification.oct,
      confidence: classification.confidence,
      classifier: functions.classifier.descriptor.fqdn,
      signals: classification.signals,
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

export async function parseDescriptorFile(
  path: string,
): Promise<MycDescriptor> {
  const text = await Deno.readTextFile(path);
  const match = text.match(/```json myc\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error(`No \`\`\`json myc block found in ${path}`);
  }
  const parsed = JSON.parse(match[1]);
  if (!isMycDescriptor(parsed)) {
    throw new Error(`Invalid MYC descriptor block in ${path}`);
  }
  return parsed;
}

function isMycDescriptor(value: unknown): value is MycDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const descriptor = value as Record<string, unknown>;
  const commitment = descriptor.commitment as
    | Record<string, unknown>
    | undefined;
  return typeof descriptor.type === "string" &&
    typeof descriptor.schema_version === "string" &&
    typeof descriptor.fqdn === "string" &&
    typeof descriptor.body === "object" &&
    descriptor.body !== null &&
    typeof commitment?.algorithm === "string" &&
    typeof commitment?.value === "string" &&
    typeof commitment?.covers === "string";
}

export async function verifyDescriptor(
  descriptor: MycDescriptor,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const actual = await sha256Hex(stableStringify(descriptor.body as Json));
  if (descriptor.commitment.algorithm !== "sha256") {
    errors.push(`Unsupported algorithm: ${descriptor.commitment.algorithm}`);
  }
  if (descriptor.commitment.covers !== "descriptor.body") {
    errors.push(
      `Unsupported commitment cover: ${descriptor.commitment.covers}`,
    );
  }
  if (actual !== descriptor.commitment.value) {
    errors.push(
      `Descriptor commitment mismatch: expected ${descriptor.commitment.value}, got ${actual}`,
    );
  }

  if (descriptor.type === "ArtifactDescriptor") {
    const formula = descriptor.body.formula as Record<string, Json> | undefined;
    const input = formula?.input as Json | undefined;
    const expected = descriptor.body.artifact_hash;
    if (input && typeof expected === "string") {
      const actualArtifactHash = await sha256Hex(stableStringify(input));
      if (actualArtifactHash !== expected) {
        errors.push(
          `Artifact formula mismatch: expected ${expected}, got ${actualArtifactHash}`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export async function verifyPath(
  path: string,
): Promise<{ ok: boolean; errors: string[]; descriptor: MycDescriptor }> {
  const descriptor = await parseDescriptorFile(path);
  const result = await verifyDescriptor(descriptor);
  return { ...result, descriptor };
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

function payloadStateForDescriptor(descriptor: MycDescriptor): string {
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

export async function scanDescriptors(
  root: string,
): Promise<DescriptorRecord[]> {
  const scanRoots = ["public", "protocols", "sites", "substrates", "sealed"]
    .map((part) => joinPath(root, part));
  const records: DescriptorRecord[] = [];
  for (const scanRoot of scanRoots) {
    if (!(await exists(scanRoot))) continue;
    for await (const path of walkMarkdown(scanRoot)) {
      try {
        records.push({ path, descriptor: await parseDescriptorFile(path) });
      } catch {
        // Human-only markdown files are valid; they are just not resolvable.
      }
    }
  }
  return records;
}

async function* walkMarkdown(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = joinPath(root, entry.name);
    if (entry.isDirectory) {
      yield* walkMarkdown(path);
    } else if (entry.isFile && entry.name.endsWith(".md")) {
      yield path;
    }
  }
}

export async function resolveFqdn(
  root: string,
  fqdn: string,
): Promise<{ path: string; descriptor: MycDescriptor } | null> {
  const records = await scanDescriptors(root);
  for (const record of records) {
    if (record.descriptor.fqdn === fqdn) return record;
  }
  for (const record of records) {
    if (descriptorAddresses(record.descriptor).includes(fqdn)) return record;
  }
  return null;
}

function descriptorAddresses(descriptor: MycDescriptor): string[] {
  const addresses = new Set<string>();
  addresses.add(descriptor.fqdn);
  const immutable = descriptor.body.immutable_fqdn;
  if (typeof immutable === "string") addresses.add(immutable);
  const output = descriptor.body.output as Record<string, Json> | undefined;
  if (output) {
    if (typeof output.fqdn === "string") addresses.add(output.fqdn);
    if (typeof output.immutable_fqdn === "string") {
      addresses.add(output.immutable_fqdn);
    }
  }
  return [...addresses];
}

function descriptorNodeKeys(descriptor: MycDescriptor): string[] {
  const keys = new Set<string>();
  for (const address of descriptorAddresses(descriptor)) keys.add(address);
  keys.add(descriptor.commitment.value);
  if (descriptor.type === "RawDescriptor") {
    const value = descriptor.body.hash;
    if (typeof value === "string") keys.add(value);
  }
  if (descriptor.type === "ArtifactDescriptor") {
    const value = descriptor.body.artifact_hash;
    if (typeof value === "string") keys.add(value);
  }
  return [...keys];
}

function refKeys(ref: Record<string, Json>): string[] {
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

function transformationEdgesFor(record: DescriptorRecord): GraphEdge[] {
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
    counts.set(
      record.descriptor.fqdn,
      (counts.get(record.descriptor.fqdn) ?? 0) + 1,
    );
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
      `${a.transform}:${JSON.stringify(a.input)}:${JSON.stringify(a.output)}`
        .localeCompare(
          `${b.transform}:${JSON.stringify(b.input)}:${
            JSON.stringify(b.output)
          }`,
        )
    )
    .map((edge) => JSON.stringify(edge));
}

export async function graphEdges(root: string): Promise<GraphEdge[]> {
  const records = await scanDescriptors(root);
  return records.flatMap((record) => transformationEdgesFor(record));
}

export async function rebuildGraph(root: string): Promise<string> {
  const edges = await graphEdges(root);
  const lines = graphLines(edges);
  const graphPath = joinPath(root, "public", "graph.ndjson");
  await ensureDir(dirname(graphPath));
  await Deno.writeTextFile(graphPath, `${lines.join("\n")}\n`);
  return graphPath;
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

  const edges = transformations.flatMap((record) =>
    transformationEdgesFor(record)
  );
  const graphPath = joinPath(root, "public", "graph.ndjson");
  const expectedGraph = `${graphLines(edges).join("\n")}\n`;
  let graphSynced = false;
  if (await exists(graphPath)) {
    const actualGraph = await Deno.readTextFile(graphPath);
    graphSynced = actualGraph === expectedGraph;
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
      [...nutritionCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ),
    errors,
    warnings,
  };
}

function verifyGraphReference(
  transformPath: string,
  ref: Record<string, Json>,
  byFqdn: Map<string, DescriptorRecord>,
  errors: string[],
  warnings: string[],
): number {
  const fqdn = typeof ref.fqdn === "string" ? ref.fqdn : null;
  const keys = refKeys(ref);
  if (keys.length === 0) {
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

export async function rebuildIndex(root: string): Promise<string> {
  const records = await scanDescriptors(root);
  const lines = indexLines(root, records);
  const indexPath = joinPath(root, "public", "index.ndjson");
  await ensureDir(dirname(indexPath));
  await Deno.writeTextFile(indexPath, `${lines.join("\n")}\n`);
  await rebuildGraph(root);
  return indexPath;
}

function indexLines(root: string, records: DescriptorRecord[]): string[] {
  return records
    .flatMap((record) =>
      descriptorAddresses(record.descriptor).map((fqdn) => ({
        fqdn,
        path: relativePath(root, record.path),
        type: record.descriptor.type,
        commitment: record.descriptor.commitment.value,
      }))
    )
    .sort((a, b) => a.fqdn.localeCompare(b.fqdn))
    .map((entry) => JSON.stringify(entry));
}

export async function verifyProjections(
  root: string,
): Promise<ProjectionVerificationResult> {
  const records = await scanDescriptors(root);
  const graph = await verifyGraph(root);
  const indexPath = joinPath(root, "public", "index.ndjson");
  const expectedIndex = `${indexLines(root, records).join("\n")}\n`;
  const errors = [...graph.errors];
  let indexSynced = false;

  if (await exists(indexPath)) {
    const actualIndex = await Deno.readTextFile(indexPath);
    indexSynced = actualIndex === expectedIndex;
    if (!indexSynced) {
      errors.push(
        `${indexPath}: index.ndjson is stale; run 'deno task myc index'`,
      );
    }
  } else {
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
    index_record_count: indexLines(root, records).length,
    errors,
    warnings: graph.warnings,
  };
}

async function resolveTargetRecord(
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

function graphEdgeRecord(
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

function relativePath(root: string, file: string): string {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : file;
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

export async function main(args: string[]): Promise<void> {
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
    console.log(JSON.stringify(result, null, 2));
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
    "  resolve <fqdn>",
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
    "  serve [--host 127.0.0.1] [--port 8787]",
    "  demo",
    "",
    "Environment:",
    "  MYC_ROOT=/Users/s0fractal/myc",
  ].join("\n");
}

if (import.meta.main) {
  main(Deno.args).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  });
}
