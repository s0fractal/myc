#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
// myc/src/x5810_resolve_proposal.ts — resolve a dormant proposal with a terminal,
// commitment-bound outcome. position: 5/8 → action × completion.
//
// Per codex coarchitect review x6300_954228 P1 (and antigravity's attention-leak
// finding): implementing a proposal's requested CODE is not the same EVENT as
// RESOLVING the proposal in the graph. A ProposalResolutionDescriptor
// (myc.proposal-resolution.v0.1) binds to the proposal's COMMITMENT and records
// a terminal outcome — implemented | rejected | superseded | withdrawn | expired
// — with evidence and resolver. The lifecycle then shows terminal truth instead
// of a proposal frozen at `proposed`. The proposal itself is never deleted
// (dormant + visible); the resolution is the immutable record of what became of it.

import { ensureDir } from "jsr:@std/fs@1.0.23";
import { join } from "jsr:@std/path@1.1.4";

export const OUTCOMES = [
  "implemented",
  "rejected",
  "superseded",
  "withdrawn",
  "expired",
] as const;
export type Outcome = (typeof OUTCOMES)[number];

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stableStringify(value: Json): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((i) => stableStringify(i)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${
    keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(
      ",",
    )
  }}`;
}
async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  )
    .join("");
}

/** Read a proposal's commitment so the resolution can BIND to it (not float). */
async function proposalCommitment(
  root: string,
  proposalFqdn: string,
): Promise<{ commitment: string; fqdn: string } | null> {
  const path = join(root, "public", "proposals", proposalFqdn);
  try {
    const text = await Deno.readTextFile(path);
    const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
    if (!m) return null;
    const d = JSON.parse(m[1]);
    if (d?.type !== "ProposedMutationDescriptor" || !d.commitment?.value) {
      return null;
    }
    return { commitment: d.commitment.value, fqdn: d.fqdn ?? proposalFqdn };
  } catch {
    return null;
  }
}

export interface ResolveInput {
  proposalFqdn: string;
  outcome: Outcome;
  evidence: string;
  resolver: string;
}

export async function resolveProposal(
  root: string,
  input: ResolveInput,
): Promise<{ ok: boolean; fqdn?: string; path?: string; error?: string }> {
  if (!OUTCOMES.includes(input.outcome)) {
    return {
      ok: false,
      error: `--outcome must be one of: ${OUTCOMES.join(", ")}`,
    };
  }
  const prop = await proposalCommitment(root, input.proposalFqdn);
  if (!prop) {
    return {
      ok: false,
      error: `proposal not found or invalid: ${input.proposalFqdn}`,
    };
  }
  const body = {
    evidence: input.evidence,
    outcome: input.outcome,
    proposal_commitment: prop.commitment, // BOUND to the proposal's commitment
    proposal_fqdn: prop.fqdn,
    resolver: input.resolver,
  };
  const value = await sha256Hex(stableStringify(body));
  const fqdn = `h.${value.slice(0, 12)}.resolution.myc.md`;
  const descriptor = {
    type: "ProposalResolutionDescriptor",
    schema_version: "myc.proposal-resolution.v0.1",
    fqdn,
    commitment: { algorithm: "sha256", value, covers: "descriptor.body" },
    body,
  };
  const md = `---
chord:
  primary: "oct:5.action"
  secondary: ["oct:7.completion"]
mode: "RESOLVE"
tension: "terminal resolution of a proposed mutation"
receipt: "file"
---

# Proposal Resolution — ${input.outcome}

The immutable record of what became of a proposed mutation. It binds to the
proposal's commitment, so it cannot float to a different proposal.

- **outcome**: \`${input.outcome}\`
- **proposal**: \`${prop.fqdn}\`
- **resolver**: \`${input.resolver}\`

\`\`\`json myc
${JSON.stringify(descriptor, null, 2)}
\`\`\`
`;
  const dir = join(root, "public", "resolutions");
  await ensureDir(dir);
  const path = join(dir, fqdn);
  await Deno.writeTextFile(path, md);
  return { ok: true, fqdn, path };
}

function parseArgs(
  args: string[],
): { pos?: string; flags: Record<string, string> } {
  const flags: Record<string, string> = {};
  let pos: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = args[++i] ?? "true";
    } else if (!pos) pos = a;
  }
  return { pos, flags };
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const { pos, flags: f } = parseArgs(args);
  const root = f.root ?? Deno.env.get("MYC_ROOT") ?? Deno.cwd();
  if (!pos) {
    console.error(
      "usage: resolve-proposal <proposal-fqdn> --outcome <implemented|rejected|superseded|withdrawn|expired> --evidence <text> [--actor a]",
    );
    Deno.exit(1);
  }
  const result = await resolveProposal(root, {
    proposalFqdn: pos,
    outcome: (f.outcome ?? "") as Outcome,
    evidence: f.evidence ?? "",
    resolver: f.actor ?? f.resolver ?? "anonymous",
  });
  console.log(JSON.stringify(
    { type: "proposal_resolution", position: "5/8", ...result },
    null,
    2,
  ));
  if (!result.ok) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
