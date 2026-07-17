// Pure descriptor construction primitives shared behind the x0100 CLI façade.
// No Deno, filesystem, network, or process dependencies belong in this module.

import { type Json, sha256Hex, stableStringify } from "./verify_core.ts";

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

export interface Classification {
  kind: string;
  actionability: string;
  oct: string;
  confidence: "low" | "medium" | "high";
  signals: string[];
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
