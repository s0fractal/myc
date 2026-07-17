// Read-only filesystem index for descriptor discovery and FQDN resolution.

import { type MycDescriptor } from "./x0110_descriptor_core.ts";
import {
  parseDescriptorText,
  verifyDescriptor,
} from "./x0120_descriptor_verify.ts";
import { joinPath } from "./x0140_paths.ts";
import { type Json } from "./verify_core.ts";

export interface DescriptorRecord {
  path: string;
  descriptor: MycDescriptor;
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

export async function parseDescriptorFile(
  path: string,
): Promise<MycDescriptor> {
  return await parseDescriptorText(await Deno.readTextFile(path), path);
}

export async function verifyPath(
  path: string,
): Promise<{ ok: boolean; errors: string[]; descriptor: MycDescriptor }> {
  const descriptor = await parseDescriptorFile(path);
  return { ...await verifyDescriptor(descriptor), descriptor };
}

async function* walkMarkdown(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = joinPath(root, entry.name);
    if (entry.isDirectory) yield* walkMarkdown(path);
    else if (entry.isFile && entry.name.endsWith(".md")) yield path;
  }
}

export async function scanDescriptors(
  root: string,
): Promise<DescriptorRecord[]> {
  const scanRoots = [
    "public",
    "protocols",
    "sites",
    "substrates",
    "sealed",
    "src",
  ].map((part) => joinPath(root, part));
  const emptyContentAddress = "e3b0c44298fc";
  const records: DescriptorRecord[] = [];
  for (const scanRoot of scanRoots) {
    if (!(await exists(scanRoot))) continue;
    for await (const path of walkMarkdown(scanRoot)) {
      if (path.endsWith(".schema.md")) continue;
      try {
        const descriptor = await parseDescriptorFile(path);
        if (descriptor.fqdn.includes(emptyContentAddress)) continue;
        records.push({ path, descriptor });
      } catch {
        // Human-only markdown files are valid; they are just not resolvable.
      }
    }
  }
  return records;
}

export function descriptorAddresses(descriptor: MycDescriptor): string[] {
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

export function descriptorNodeKeys(descriptor: MycDescriptor): string[] {
  const keys = new Set(descriptorAddresses(descriptor));
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

export async function resolveFqdn(
  root: string,
  fqdn: string,
): Promise<DescriptorRecord | null> {
  const records = await scanDescriptors(root);
  for (const record of records) {
    if (record.descriptor.fqdn === fqdn) return record;
  }
  for (const record of records) {
    if (descriptorAddresses(record.descriptor).includes(fqdn)) return record;
  }
  return null;
}
