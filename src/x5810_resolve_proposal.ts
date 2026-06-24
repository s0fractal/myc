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
import { dirname, join } from "jsr:@std/path@1.1.4";
import { verifyEvidence } from "./x2A00_evidence.ts";
import { authenticateFile } from "./x2F50_voice_auth.ts";

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

/** A structured pointer to evidence — never free text for finality (codex
 *  x7d00_954231 P0.1). `ref` is an fqdn or hash; `commitment` is the thing's
 *  commitment, so the projection can resolve + commitment-check it. */
export interface EvidenceRef {
  kind: string; // commit | chord | apply | publish | review | phase | …
  ref: string; // fqdn or hash
  commitment: string; // the referenced thing's commitment (checked at projection)
}

export interface ResolveInput {
  proposalFqdn: string;
  outcome: Outcome;
  evidence_refs: EvidenceRef[];
  evidence_note?: string;
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
  // sorted-key stable body; evidence is STRUCTURED refs (finality cannot rest on
  // free text). Human commentary is allowed in evidence_note but is not authority.
  const body: Record<string, Json> = {
    evidence_refs: input.evidence_refs.map((e) => ({
      commitment: e.commitment,
      kind: e.kind,
      ref: e.ref,
    })),
    outcome: input.outcome,
    proposal_commitment: prop.commitment, // BOUND to the proposal's commitment
    proposal_fqdn: prop.fqdn,
    resolver: input.resolver,
  };
  if (input.evidence_note) body.evidence_note = input.evidence_note;
  const value = await sha256Hex(stableStringify(body));
  const fqdn = `h.${value.slice(0, 12)}.resolution.myc.md`;
  const descriptor = {
    type: "ProposalResolutionDescriptor",
    schema_version: "myc.proposal-resolution.v0.2",
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

# Proposal Resolution (v0.2) — ${input.outcome}

A CLAIM about what became of a proposed mutation. It binds to the proposal's
commitment. It becomes FINAL only when its resolver is authenticated
(\`t myc authenticate\` as the resolver) and its structured evidence_refs resolve
by commitment — until then the lifecycle shows it as \`resolution_claimed\`, never
as truth. Human commentary lives in evidence_note and is never authority.

- **outcome**: \`${input.outcome}\`
- **proposal**: \`${prop.fqdn}\`
- **resolver**: \`${input.resolver}\` (sign to make it count toward finality)
- **evidence**: ${input.evidence_refs.length} structured ref(s)

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
): { pos?: string; flags: Record<string, string>; refs: string[] } {
  const flags: Record<string, string> = {};
  const refs: string[] = [];
  let pos: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const key = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      // a flag is boolean if its next token is absent or another --flag, so a
      // valueless flag like --sign cannot swallow the following flag's value.
      const next = args[i + 1];
      const val = eq >= 0
        ? a.slice(eq + 1)
        : (next && !next.startsWith("--") ? args[++i] : "true");
      if (key === "evidence-ref") refs.push(val); // repeatable
      else flags[key] = val;
    } else if (!pos) pos = a;
  }
  return { pos, flags, refs };
}

/** Derive a canonical, verifiable evidence_ref from a real receipt/descriptor —
 *  so a model points at the proof instead of hand-typing {kind, ref, commitment}
 *  and CANNOT mistype the commitment (the failure codex caught in P1: an
 *  abbreviated commit id and a literal "built"). The derived ref is exactly what
 *  x2A00 will resolve, so a from-receipt evidence always verifies. */
export async function deriveEvidence(
  receiptPath: string,
): Promise<{ kind: string; ref: string; commitment: string } | null> {
  let text: string;
  try {
    text = await Deno.readTextFile(receiptPath);
  } catch {
    return null;
  }
  const base = receiptPath.replace(/^.*\//, "");
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const field = (n: string) =>
    fm.match(new RegExp(`${n}:\\s*"?([^"\\n]+)"?`))?.[1]?.trim();
  const sporeId = field("spore_id");
  if (sporeId) return { kind: "apply", ref: base, commitment: sporeId };
  const intent = field("intent_hash");
  if (intent) return { kind: "phase", ref: base, commitment: intent };
  const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
  if (m) {
    try {
      const d = JSON.parse(m[1]);
      const c = d?.commitment?.value;
      if (c && d?.fqdn) {
        const kind = /publish/i.test(d.type)
          ? "publish"
          : /review/i.test(d.type)
          ? "review"
          : "descriptor";
        return { kind, ref: String(d.fqdn), commitment: String(c) };
      }
    } catch { /* not a descriptor receipt */ }
  }
  return null;
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const { pos, flags: f, refs } = parseArgs(args);
  const root = f.root ?? Deno.env.get("MYC_ROOT") ?? Deno.cwd();
  if (!pos) {
    console.error(
      "usage: resolve-proposal <proposal-fqdn> --outcome <implemented|…> [--evidence-ref <kind:ref:commitment>] [--from-receipt <path>] [--note <text>] [--actor a]\n  --from-receipt derives a canonical evidence_ref from a real receipt (you cannot mistype the commitment).\n  then `t myc authenticate <resolution> --voice <resolver>` to count toward finality",
    );
    Deno.exit(1);
  }
  if ("sign" in f && f.sign !== "true") {
    console.error("# error: --sign is a boolean flag and takes no value");
    Deno.exitCode = 1;
    return;
  }
  // each --evidence-ref is "kind:ref:commitment"
  const evidence_refs: Array<
    { kind: string; ref: string; commitment: string }
  > = refs.map((r) => {
    const [kind, ref, commitment] = r.split(":");
    return {
      kind: kind ?? "ref",
      ref: ref ?? "",
      commitment: commitment ?? "",
    };
  });
  // --from-receipt <path> (repeatable): derive the evidence_ref FROM the proof,
  // then pass it through the SAME verifier finality uses. Derivation failure is
  // fatal: a proof-bearing convenience must never silently emit an evidence-less
  // claim while returning success.
  let receiptError = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from-receipt") {
      const path = args[i + 1];
      if (!path || path.startsWith("--")) {
        console.error("# error: --from-receipt requires a path");
        receiptError = true;
        continue;
      }
      i++;
      const derived = await deriveEvidence(path);
      if (!derived) {
        console.error(`# error: could not derive evidence from ${path}`);
        receiptError = true;
        continue;
      }
      const verdict = await verifyEvidence(derived, {
        root,
        superproject: dirname(root),
      });
      if (!verdict.valid) {
        console.error(
          `# error: derived evidence does not verify: ${verdict.reason}`,
        );
        receiptError = true;
        continue;
      }
      evidence_refs.push(derived);
    }
  }
  if (receiptError) {
    Deno.exitCode = 1;
    return;
  }
  const resolver = f.actor ?? f.resolver ?? "anonymous";
  const result = await resolveProposal(root, {
    proposalFqdn: pos,
    outcome: (f.outcome ?? "") as Outcome,
    evidence_refs,
    evidence_note: f.note,
    resolver,
  });
  // --sign: resolve + authenticate as the resolver in one step, so the common
  // case is correct-by-default (an unsigned resolution stays a mere claim). Signs
  // ONLY as the resolver — signer must equal actor, never another voice.
  let signed: { ok: boolean; voice: string; reason?: string } | undefined;
  if (result.ok && result.path && "sign" in f) {
    signed = await authenticateFile(result.path, resolver);
  }
  // Friction found walking the loop as a user: an unsigned resolution silently
  // stalls at "no authenticated resolver", and an `implemented` outcome with no
  // evidence stalls at "evidence did not resolve". The CLI gave no next step.
  const next = result.ok && !("sign" in f)
    ? `UNSIGNED — run \`t myc authenticate ${result.fqdn} --voice ${resolver}\`` +
      ` (or re-run with --sign) so it counts toward finality` +
      (evidence_refs.length === 0 && f.outcome === "implemented"
        ? `; an "implemented" outcome also needs evidence (--evidence-ref / --from-receipt), or it stalls on "evidence did not resolve"`
        : "")
    : undefined;
  console.log(JSON.stringify(
    { type: "proposal_resolution", position: "5/8", ...result, signed, next },
    null,
    2,
  ));
  if (!result.ok || ("sign" in f && !signed?.ok)) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
