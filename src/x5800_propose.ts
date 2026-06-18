#!/usr/bin/env -S deno run --allow-read --allow-write
// myc/src/x5800_propose.ts — propose a mutation INTO the membrane (the efferent
// half, dormant slice). architect plan x7300_954205 T4 (safe v0); authorized
// 2026-06-18 ("спроєктуй сам схему ProposedMutationDescriptor і збудуй
// dormant-propose").
// position: 5/8 → action(5) × completion-pair(8) = a written act that lands an
//                 artifact (a proposal) without granting it trust
// placement_policy: axis
//
// This is "пропонуючи зміни і мутації" in its SAFEST form. A proposal is a spore
// before germination: content-addressed, integrity-verifiable, UNSIGNED, and
// always DORMANT. It enters the membrane (public/proposals/) where the SEE
// surfaces show it as proposed-but-unverified. It does NOT propagate, sign, or
// germinate — germination (witness → publish → resonance) is the gated trust flow
// that needs key custody. A proposal is reversible: it is just a file.
//
// SAFETY INVARIANT (also enforced by the x6C00 audit): state is ALWAYS "dormant".
// You cannot forge a verified proposal; trust is earned through the witness flow,
// never self-declared here.

import { ensureDir } from "jsr:@std/fs@1.0.23";
import { join } from "jsr:@std/path@1.1.4";

// The verifier backends a proposal may require — the organism's proof-kinds.
export const BACKENDS = ["omega", "liquid", "trinity", "spore"] as const;
export type Backend = (typeof BACKENDS)[number];

// Canonical commitment, parity with x0100_myc.ts / x3700 (same body → same hash).
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stableStringify(value: Json): string {
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
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ProposeInput {
  proposal: string;
  requires: Backend;
  proposer: string;
}

export interface ProposeResult {
  ok: boolean;
  fqdn?: string;
  path?: string;
  commitment?: string;
  state?: "dormant";
  error?: string;
}

/** Build + write a dormant ProposedMutationDescriptor under public/proposals/.
 *  Content-addressed: same proposal → same file. Returns the proposal's fqdn. */
export async function propose(
  root: string,
  input: ProposeInput,
): Promise<ProposeResult> {
  if (!input.proposal || !input.proposal.trim()) {
    return { ok: false, error: "proposal text is required" };
  }
  if (!BACKENDS.includes(input.requires)) {
    return {
      ok: false,
      error: `--requires must be one of: ${BACKENDS.join(", ")}`,
    };
  }
  // body is sorted-key stable; state is ALWAYS dormant (the safety invariant).
  const body = {
    proposal: input.proposal.trim(),
    proposer: input.proposer,
    requires_verification: input.requires,
    state: "dormant" as const,
  };
  const commitment = await sha256Hex(stableStringify(body));
  const short = commitment.slice(0, 12);
  const fqdn = `h.${short}.proposal.myc.md`;
  const descriptor = {
    type: "ProposedMutationDescriptor",
    schema_version: "myc.proposed-mutation.v0.1",
    fqdn,
    commitment: {
      algorithm: "sha256",
      value: commitment,
      covers: "descriptor.body",
    },
    body,
  };
  const md = `---
chord:
  primary: "oct:5.action"
  secondary: ["oct:3.7"]
energy: 0.5
mode: "PROPOSE"
tension: "dormant mutation proposed into the membrane"
confidence: "low"
receipt: "file"
---

# Proposed Mutation (dormant)

A mutation proposed into the membrane. It is content-addressed and
integrity-verifiable, but UNSIGNED and DORMANT: it carries no trust until a
witness verifies it and it germinates through the gated consensus flow. Until
then it is visible here, never hidden, never auto-applied.

- **requires verification by**: \`${input.requires}\`
- **proposer**: \`${input.proposer}\` (unsigned — authenticity awaits key custody)

\`\`\`json myc
${JSON.stringify(descriptor, null, 2)}
\`\`\`
`;
  const dir = join(root, "public", "proposals");
  await ensureDir(dir);
  const path = join(dir, fqdn);
  await Deno.writeTextFile(path, md);
  return { ok: true, fqdn, path, commitment, state: "dormant" };
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = args[++i] ?? "true";
    }
  }
  return flags;
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const f = parseFlags(args);
  const root = f.root ?? Deno.env.get("MYC_ROOT") ?? Deno.cwd();
  const result = await propose(root, {
    proposal: f.text ?? f.proposal ?? "",
    requires: (f.requires ?? f.backend ?? "") as Backend,
    proposer: f.actor ?? f.proposer ?? "anonymous",
  });
  console.log(JSON.stringify(
    {
      type: "proposed_mutation",
      position: "5/8",
      ...result,
      note: result.ok
        ? "dormant proposal written; it carries no trust until witnessed + germinated (gated). See `t myc lifecycle` / `t myc membrane`."
        : undefined,
    },
    null,
    2,
  ));
  if (!result.ok) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
