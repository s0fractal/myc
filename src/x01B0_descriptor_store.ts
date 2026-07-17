// Canonical filesystem persistence for generated MYC descriptor markdown.

import { type MycDescriptor } from "./x0110_descriptor_core.ts";

export async function writeDescriptorFile(
  path: string,
  descriptor: MycDescriptor,
  title: string,
  note: string,
): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
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
