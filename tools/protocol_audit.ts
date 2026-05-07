import { joinPath, parseDescriptorFile } from "./myc.ts";

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
]);

const LOCKED_FUNCTION_FQDNS = new Set([
  "h.4f76fd8466bc.myc-raw-bytes-sha256.function.myc.md",
  "h.340cb8baf52e.myc-intent-rules-classifier.function.myc.md",
  "h.849874aa8a18.myc-fqdn-naming-policy.function.myc.md",
]);

const PUBLIC_PATH_ALLOWLIST = new Set([
  "public/graph.ndjson",
  "public/index.ndjson",
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
  if (!PUBLIC_PATH_ALLOWLIST.has(relative) && text.includes("/Users/")) {
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
    errors.push(`${relative}: RecipeDescriptor is Phase 4 and not enabled`);
  }
  if (descriptor.type === "CapabilityDescriptor") {
    errors.push(`${relative}: CapabilityDescriptor is Phase 5 and not enabled`);
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
