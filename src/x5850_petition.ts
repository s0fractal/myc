#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
// myc/src/x5850_petition.ts — external PETITION intake (the "Spore Drop", renamed).
// position: 5/85 → action(5) × cache/projection(8) = a written act that lands an
//                  external agent's signed offer without granting it any trust.
// placement_policy: axis
//
// Provenance: codex proposed the external inbox (x4d00_956706); claude's review
// (x3300_956707) corrected two things — rename off the `spore` homonym to `petition`
// (`petition_id`, never `spore_id`), and BUILD ON the existing dormant-propose
// lifecycle rather than fork a parallel one; codex accepted (x5000_956709). This is
// the corrected P0: LOCAL intake, no network endpoint (that is P1/P2).
//
// North star: open proposal, closed authority; cheap ingress, expensive acceptance;
// hashes at the boundary, witnesses at the core. A petition is a REFERENCE (CID / URL
// / hash), never an inline body. Its Ed25519 signature proves WHO submitted — never
// that the federation accepted. It becomes a normal DORMANT proposal (reusing
// x5800_propose), earning nothing until a voice witnesses it. No fetch happens here.

import { ed25519Verify } from "./x2F50_voice_auth.ts";
import { type Backend, BACKENDS, propose } from "./x5800_propose.ts";

const PETITION_PREFIX = "trinity-petition:v1";
const MAX_REF_LEN = 512;
const MAX_AGENT_LEN = 200;
const DEFAULT_MAX_AGE_SEC = 24 * 3600;

export interface PetitionEnvelope {
  ref: string; // a CID / https URL / hash — a REFERENCE, never an inline body
  agent: string; // base64 raw Ed25519 public key: the external agent's identity
  ts: number; // unix seconds
  nonce: string;
  sig: string; // base64 Ed25519 signature over the canonical payload
}

/** The exact bytes the agent signs and we re-derive to verify. Fields are typed, so
 *  colons inside `ref` (e.g. `https://…`) are never parsed back — the payload is only
 *  ever rebuilt from the fields, never split. */
export function canonicalPetitionPayload(e: PetitionEnvelope): string {
  return `${PETITION_PREFIX}:${e.ref}:${e.agent}:${e.ts}:${e.nonce}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PetitionResult {
  ok: boolean;
  petition_id?: string;
  fqdn?: string;
  state?: "dormant";
  duplicate?: boolean;
  /** Standing is diagnostic-only and not yet implemented (P4). It never grants
   *  rights, citizenship, registry/quorum/roadmap mutation — recorded here so the
   *  boundary is explicit at intake. */
  standing?: string;
  error?: string;
}

const STANDING_NOTE =
  "diagnostic-only (P4, not yet implemented); grants no rights";

export interface PetitionValidation {
  ok: boolean;
  petition_id?: string;
  error?: string;
}

/** PURE validation + signature verification for a petition envelope: bound-checks,
 *  freshness, Ed25519 verify, and the `petition_id`. NO filesystem and NO fetch, so
 *  the SAME gate is reusable by the CLI (which then writes a descriptor via x5800)
 *  and by the myc.md worker (which then puts to KV) — both store only AFTER this
 *  passes. `opts.now` makes the freshness window testable. The signature is checked
 *  here precisely so no caller ever fetches or stores an unverified petition. */
export async function validatePetition(
  e: PetitionEnvelope,
  opts: { now?: number; maxAgeSec?: number; inlineBody?: string } = {},
): Promise<PetitionValidation> {
  // 0. An inline body is rejected outright — a petition carries a reference only.
  if (opts.inlineBody != null && opts.inlineBody !== "") {
    return {
      ok: false,
      error: "a petition carries a reference (ref), never an inline body",
    };
  }
  // 1. Bound + validate the envelope cheaply, before any crypto.
  if (!e.ref || e.ref.length > MAX_REF_LEN || /\s/.test(e.ref)) {
    return {
      ok: false,
      error:
        "ref must be a non-empty CID/URL/hash with no whitespace, ≤512 chars",
    };
  }
  if (!e.agent || e.agent.length > MAX_AGENT_LEN) {
    return {
      ok: false,
      error: "agent (base64 Ed25519 pubkey) missing or malformed",
    };
  }
  if (!Number.isInteger(e.ts)) {
    return { ok: false, error: "ts must be a unix-seconds integer" };
  }
  if (!e.nonce) return { ok: false, error: "nonce is required" };
  if (!e.sig) return { ok: false, error: "sig is required" };
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const maxAge = opts.maxAgeSec ?? DEFAULT_MAX_AGE_SEC;
  if (Math.abs(now - e.ts) > maxAge) {
    return {
      ok: false,
      error: "stale or future timestamp (outside the freshness window)",
    };
  }
  // 2. Verify the signature over the canonical payload — BEFORE any fetch or store.
  const payload = canonicalPetitionPayload(e);
  if (!(await ed25519Verify(payload, e.sig, e.agent))) {
    return {
      ok: false,
      error: "signature does not verify against the agent key",
    };
  }
  // 3. Idempotency key: the hash of exactly what was signed.
  return { ok: true, petition_id: await sha256Hex(payload) };
}

/** Accept one external petition into LOCAL myc: validate + verify (no fetch), then
 *  write a DORMANT proposal via x5800_propose. The worker path (P1) reuses
 *  `validatePetition` and puts to KV instead; this is the filesystem caller. */
export async function submitPetition(
  root: string,
  e: PetitionEnvelope,
  opts: {
    now?: number;
    maxAgeSec?: number;
    requires?: Backend;
    inlineBody?: string;
  } = {},
): Promise<PetitionResult> {
  const v = await validatePetition(e, opts);
  if (!v.ok) return { ok: false, error: v.error };
  const petition_id = v.petition_id!;
  // Land it as a DORMANT proposal — reusing x5800's descriptor + invariant.
  const requires: Backend = opts.requires && BACKENDS.includes(opts.requires)
    ? opts.requires
    : "trinity";
  const r = await propose(root, {
    proposal:
      `external petition — reference: ${e.ref} (body deferred to a later fetch phase; never inline)`,
    requires,
    proposer: `petition:${e.agent}`,
    petition: {
      petition_id,
      ref: e.ref,
      agent: e.agent,
      ts: e.ts,
      nonce: e.nonce,
      sig: e.sig,
    },
  });
  if (!r.ok) return { ok: false, error: r.error };
  return {
    ok: true,
    petition_id,
    fqdn: r.fqdn,
    state: "dormant",
    duplicate: r.created === false,
    standing: STANDING_NOTE,
  };
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
  if (f.text != null || f.body != null || f.file != null) {
    console.error(
      "# error: a petition carries a reference (--ref <cid|url|hash>), never an inline --text/--body/--file",
    );
    Deno.exitCode = 1;
    return;
  }
  const result = await submitPetition(root, {
    ref: f.ref ?? "",
    agent: f.agent ?? "",
    ts: Number(f.ts ?? NaN),
    nonce: f.nonce ?? "",
    sig: f.sig ?? "",
  }, { requires: (f.requires ?? f.backend) as Backend | undefined });
  console.log(JSON.stringify(
    {
      type: "petition_intake",
      position: "5/85",
      ...result,
      note: result.ok
        ? (result.duplicate
          ? "petition already on file (idempotent); still DORMANT — witness it via `t myc lifecycle`"
          : "petition accepted as a DORMANT proposal; it carries no trust until a voice witnesses it")
        : undefined,
    },
    null,
    2,
  ));
  if (!result.ok) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
