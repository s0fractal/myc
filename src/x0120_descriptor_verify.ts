// Pure parsing and verification for MYC descriptors. Filesystem access belongs
// in the x0100 façade; this module accepts text and values only.

import { type MycDescriptor } from "./x0110_descriptor_core.ts";
import { type Json, sha256Hex, stableStringify } from "./verify_core.ts";

export function parseYamlFrontmatter(text: string): Record<string, unknown> {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yamlText = match[1];
  const obj: Record<string, unknown> = {};
  const lines = yamlText.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentList: unknown[] | null = null;

  for (const line of lines) {
    if (line.trim().startsWith("#") || !line.trim()) continue;

    const listItemMatch = line.match(/^\s*-\s*(.*)$/);
    if (listItemMatch && currentKey) {
      if (!currentList) {
        currentList = [];
        obj[currentKey] = currentList;
      }
      let val: string = listItemMatch[1].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      currentList.push(val);
      continue;
    }

    const keyValueMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (keyValueMatch) {
      currentKey = keyValueMatch[1].trim();
      currentList = null;
      let val = keyValueMatch[2].trim();
      if (val === "") continue;
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

      if (val === "true") obj[currentKey] = true;
      else if (val === "false") obj[currentKey] = false;
      else if (val === "null") obj[currentKey] = null;
      else if (!isNaN(Number(val))) obj[currentKey] = Number(val);
      else obj[currentKey] = val;
    }
  }
  return obj;
}

export function isMycDescriptor(value: unknown): value is MycDescriptor {
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

export async function parseDescriptorText(
  text: string,
  sourceName: string,
): Promise<MycDescriptor> {
  const match = text.match(/```json myc\n([\s\S]*?)\n```/);
  if (match) {
    const parsed: unknown = JSON.parse(match[1]);
    if (!isMycDescriptor(parsed)) {
      throw new Error(`Invalid MYC descriptor block in ${sourceName}`);
    }
    return parsed;
  }

  const frontmatter = parseYamlFrontmatter(text);
  const filename = sourceName.split("/").pop() || "";
  const coordinateVal = frontmatter.coordinate;
  const hasCoordinate =
    (typeof coordinateVal === "string" && coordinateVal.length > 0) ||
    /^x[0-9a-fA-F]{4}/.test(filename);
  const isMycMd = filename.endsWith(".myc.md") || filename.endsWith(".md");

  if (hasCoordinate && isMycMd) {
    const coordMatch = filename.match(/^(x[0-9a-fA-F]{4})/);
    const coordinate =
      (typeof coordinateVal === "string" ? coordinateVal : "") ||
      (coordMatch ? coordMatch[1] : "x0000");
    const typeVal = frontmatter.type;
    const type = (typeof typeVal === "string" ? typeVal : "") ||
      "VectorDocumentDescriptor";
    const statusVal = frontmatter.status;
    const status = (typeof statusVal === "string" ? statusVal : "") ||
      "draft";
    const body: Record<string, Json> = {
      coordinate,
      type,
      status,
      ...frontmatter as Record<string, Json>,
    };
    const schemaVersionVal = frontmatter.schema_version;
    const fqdnVal = frontmatter.fqdn;
    const descriptor: MycDescriptor = {
      type,
      schema_version:
        (typeof schemaVersionVal === "string" ? schemaVersionVal : "") ||
        "myc.vector-document.v0.1",
      fqdn: (typeof fqdnVal === "string" ? fqdnVal : "") || filename,
      commitment: {
        algorithm: "sha256",
        value: "",
        covers: "descriptor.body",
      },
      body,
    };
    descriptor.commitment.value = await sha256Hex(stableStringify(body));
    return descriptor;
  }

  throw new Error(
    `No \`\`\`json myc block or valid YAML frontmatter found in ${sourceName}`,
  );
}

export async function verifyDescriptor(
  descriptor: MycDescriptor,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const actual = await sha256Hex(stableStringify(descriptor.body));
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
    const input = formula?.input;
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
