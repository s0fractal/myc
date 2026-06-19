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
  /** Optional TYPED finality policy (codex bootstrap x2900_954396): the verified
   *  principals must cover these class counts, e.g. {human:1, model:1}. Prose is
   *  not policy — this is the machine-enforced rule. */
  finality_policy?: { classes: Record<string, number> };
  /** Optional ACTUATION grant (codex x5d00_954412): this proposal authorizes ONE
   *  concrete action — the one whose canonical intent_commitment is recorded here.
   *  A warrant admits an action only if a final proposal grants exactly its intent;
   *  a proposal with no grant is governance history, never actuation authority. */
  action_grant?: { intent_commitment: string };
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
  const body: Record<string, unknown> = {
    proposal: input.proposal.trim(),
    proposer: input.proposer,
    requires_verification: input.requires,
    state: "dormant" as const,
  };
  if (input.finality_policy) body.finality_policy = input.finality_policy;
  if (input.action_grant) body.action_grant = input.action_grant;
  const commitment = await sha256Hex(
    stableStringify(body as unknown as Parameters<typeof stableStringify>[0]),
  );
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
  // repeatable `--policy class:count` → a typed finality policy (codex bootstrap)
  const classes: Record<string, number> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--policy" && args[i + 1]) {
      const [cls, n] = args[i + 1].split(":");
      if (cls && n && Number.isInteger(+n)) classes[cls] = +n;
    }
  }
  // The proposal may authorize one concrete action. Preferred: --action-intent
  // <intent.json> — read, VALIDATE the schema, and compute the grant internally,
  // so no commitment is ever hand-carried (codex x6d00 P0.5). Advanced compat:
  // --action-grant <64-hex> for a pre-computed commitment, strictly validated.
  let action_grant: { intent_commitment: string } | undefined;
  const intentPath = f["action-intent"];
  if (intentPath && intentPath !== "true") {
    const { intentCommitment, validateIntent } = await import(
      "./x5820_action_intent.ts"
    );
    let raw: unknown;
    try {
      raw = JSON.parse(await Deno.readTextFile(intentPath));
    } catch {
      console.error(`# error: could not read action-intent from ${intentPath}`);
      Deno.exitCode = 1;
      return;
    }
    const v = validateIntent(raw);
    if (!v.ok) {
      console.error(`# error: invalid action-intent: ${v.error}`);
      Deno.exitCode = 1;
      return;
    }
    action_grant = { intent_commitment: await intentCommitment(v.intent) };
  } else {
    const grant = f["action-grant"];
    if (grant && grant !== "true") {
      if (!/^[0-9a-f]{64}$/.test(grant)) {
        console.error(
          "# error: --action-grant must be a 64-hex intent_commitment (or use --action-intent <intent.json>)",
        );
        Deno.exitCode = 1;
        return;
      }
      action_grant = { intent_commitment: grant };
    }
  }
  const result = await propose(root, {
    proposal: f.text ?? f.proposal ?? "",
    requires: (f.requires ?? f.backend ?? "") as Backend,
    proposer: f.actor ?? f.proposer ?? "anonymous",
    finality_policy: Object.keys(classes).length > 0 ? { classes } : undefined,
    action_grant,
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
