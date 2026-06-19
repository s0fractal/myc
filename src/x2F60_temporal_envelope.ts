// myc/src/x2F60_temporal_envelope.ts — Temporal trust: format contract + classifier.
// position: 2/F.6 → mirror × bridge, the time a signature was actually made.
//
// codex x2d00_954422: **a classifier is not a verifier.** An earlier draft emitted
// `historical_v1` / `valid_at_signing` from a string allowlist, with no Ed25519
// check, no timeline-root recompute, no event-chain verification, and no anchor
// proof — presence dressed as proof, the lesson the membrane keeps relearning. And
// its envelope was temporally CIRCULAR: the future Bitcoin receipt sat inside the
// signed bytes, but a real OpenTimestamps receipt can only exist AFTER the envelope
// digest does.
//
// This module is therefore deliberately SCOPED to (1) the NON-CIRCULAR contract —
// a signature envelope that binds no future anchor, and a separate anchor receipt
// whose subject is the envelope commitment — and (2) an honest FORMAT classifier.
// It performs NO cryptography yet: every verdict carries `proof_complete: false`,
// and its strongest result is `temporal_candidate`, never `anchored_valid`. The
// real verification pipeline (signature, root recompute, chain authorization,
// anchor-proof bytes) is codex P1/P2. OTS proves existence no-later-than a block,
// never an author's signing instant — so the temporal axis is `valid_at_anchor`,
// never `valid_at_signing`.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { type KeyEvent, resolveKeyState } from "./x2F70_keytimeline.ts";

export const SIGNATURE_DOMAIN = "myc.temporal-signature.v1";

/** Signed FIRST. It binds NO future anchor and asserts no block height it cannot
 *  prove (codex: non-circular). `key_timeline_root` means only "the signer selected
 *  its key under this declared snapshot" — untrusted until a verifier recomputes it. */
export interface TemporalSignatureEnvelope {
  domain: string; // must equal SIGNATURE_DOMAIN
  descriptor_commitment: string;
  signer: string;
  key_timeline_root: string;
  nonce: string;
}

/** Produced LATER, SEPARATE from the signed envelope. Its height/hash are derived
 *  from verified proof bytes, never copied from the envelope; it is meaningful only
 *  if a registered verifier proves those bytes attest exactly `subject`. Verifying
 *  the proof bytes is codex P2 — not done here. */
export interface TemporalAnchorReceipt {
  type: "TemporalAnchorReceipt.v1";
  subject: string; // sha256:<envelope commitment>
  proof_kind: string; // e.g. "opentimestamps"
  proof_commitment: string;
  bitcoin_block_height: number;
  bitcoin_block_hash: string;
  verifier: string;
}

/** Honest FORMAT standing — NOT proof. Cryptographic verdicts (signature_invalid,
 *  anchored_valid, revoked_or_compromised) belong to the P1/P2 verifier and are
 *  intentionally NOT emitted here. */
export type Standing =
  | "unsigned" // no content_sig at all
  | "malformed" // a v1 envelope of the wrong shape — fail closed
  | "unavailable" // required input missing
  | "current_registry_only" // v0 — the signature verifier checks it vs the pinned registry, not here
  | "temporal_unanchored_candidate" // valid-shaped v1 envelope, no anchor receipt binding it
  | "temporal_candidate"; // v1 envelope + an anchor receipt whose subject matches — proof NOT verified

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stable(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  return `{${
    Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")
  }}`;
}
async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  )
    .join("");
}

/** The commitment the Ed25519 signature covers — the stable encoding of the signed
 *  envelope. It contains no anchor, so the same bytes can later be attested by an
 *  external receipt without being rewritten (codex: non-circular). Changing any
 *  field (incl. nonce, key_timeline_root) changes this value. */
export async function envelopeCommitment(
  env: TemporalSignatureEnvelope,
): Promise<string> {
  return await sha256(stable({
    descriptor_commitment: env.descriptor_commitment,
    domain: env.domain,
    key_timeline_root: env.key_timeline_root,
    nonce: env.nonce,
    signer: env.signer,
  }));
}

export function validateEnvelope(
  v: unknown,
): { ok: true; env: TemporalSignatureEnvelope } | { ok: false; error: string } {
  if (!v || typeof v !== "object") {
    return { ok: false, error: "envelope must be an object" };
  }
  const o = v as Record<string, unknown>;
  if (o.domain !== SIGNATURE_DOMAIN) {
    return { ok: false, error: `domain must be ${SIGNATURE_DOMAIN}` };
  }
  for (
    const f of ["descriptor_commitment", "signer", "key_timeline_root", "nonce"]
  ) {
    if (typeof o[f] !== "string" || !(o[f] as string)) {
      return { ok: false, error: `${f} must be a non-empty string` };
    }
  }
  return {
    ok: true,
    env: {
      domain: o.domain as string,
      descriptor_commitment: o.descriptor_commitment as string,
      signer: o.signer as string,
      key_timeline_root: o.key_timeline_root as string,
      nonce: o.nonce as string,
    },
  };
}

/** Injected, explicit (codex: MYC never reads ambient paths or its parent). */
export interface TrustBundle {
  anchor_receipt?: TemporalAnchorReceipt;
  timeline_events?: KeyEvent[];
}

export interface StandingVerdict {
  standing: Standing;
  /** ALWAYS false in this slice — no signature/root/chain/anchor-proof is verified
   *  here. A `temporal_candidate` is a CANDIDATE, never a proven historical fact. */
  proof_complete: false;
  reason: string;
  signer?: string;
  envelope_commitment?: string;
  /** the anchor receipt's claimed height — DERIVED FROM CALLER INPUT, not proof. */
  anchored_by_height?: number;
  /** advisory: key state at the anchor against an UNVERIFIED timeline (not root- or
   *  chain-verified here). Routing hint only, never authority. */
  valid_at_anchor?: boolean;
  trusted_now?: boolean;
  signing_key?: string | null;
}

/** Classify the FORMAT standing of a content_sig. Fail closed; never proof. */
export async function classifyStanding(
  contentSig: { covers?: string; envelope?: unknown },
  bundle?: TrustBundle | null,
): Promise<StandingVerdict> {
  if (!contentSig || (!contentSig.covers && !contentSig.envelope)) {
    return {
      standing: "unsigned",
      proof_complete: false,
      reason: "no content_sig present",
    };
  }
  // v0 — signs only the body commitment, binds no time.
  if (contentSig.covers === "commitment" || !contentSig.envelope) {
    return {
      standing: "current_registry_only",
      proof_complete: false,
      reason:
        "v0 signature binds no time; its validity vs the pinned registry is the signature verifier's job, not this classifier's — never historically anchored",
    };
  }
  const v = validateEnvelope(contentSig.envelope);
  if (!v.ok) {
    return {
      standing: "malformed",
      proof_complete: false,
      reason: `v1 envelope: ${v.error}`,
    };
  }
  const env = v.env;
  const commitment = await envelopeCommitment(env);
  const receipt = bundle?.anchor_receipt;
  // an anchor receipt counts as a CANDIDATE binding only if its subject is exactly
  // this envelope's commitment. We do NOT verify the proof bytes (codex P2), so this
  // can never exceed `temporal_candidate`.
  const subjectMatches = !!receipt &&
    receipt.subject === `sha256:${commitment}`;
  if (!receipt || !subjectMatches) {
    return {
      standing: "temporal_unanchored_candidate",
      proof_complete: false,
      reason: receipt
        ? "anchor receipt subject does not match this envelope commitment — not a binding"
        : "no anchor receipt — a v1 envelope without an attested anchor is unanchored",
      signer: env.signer,
      envelope_commitment: commitment,
    };
  }
  const verdict: StandingVerdict = {
    standing: "temporal_candidate",
    proof_complete: false,
    reason:
      "anchor receipt names this envelope, but its proof bytes are NOT verified here (codex P2) — a candidate, not a proven anchored fact",
    signer: env.signer,
    envelope_commitment: commitment,
    anchored_by_height: receipt.bitcoin_block_height,
  };
  if (bundle?.timeline_events) {
    const ks = resolveKeyState(bundle.timeline_events, env.signer, {
      kind: "bitcoin_block",
      height: receipt.bitcoin_block_height,
    });
    verdict.valid_at_anchor = ks.valid_at_signing; // advisory: window contains anchor
    verdict.trusted_now = ks.trusted_now;
    verdict.signing_key = ks.signing_key;
  }
  return verdict;
}

// ── CLI surface (read-only): report the honest FORMAT standing distribution ──────
function coversOf(text: string): string | null {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const sig = fm.match(/content_sig:\n((?: {2}.*\n?)+)/)?.[1];
  if (!sig) return null;
  return sig.match(/covers:\s*"?([^"\n]+)"?/)?.[1]?.trim() ?? "commitment";
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory && !e.name.startsWith(".")) yield* walk(p);
    else if (e.isFile && e.name.endsWith(".myc.md")) yield p;
  }
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  if (args[0] !== "standing") {
    console.log(JSON.stringify(
      {
        type: "temporal_envelope",
        position: "2/F6",
        usage: "standing [dir] [--json]",
        note:
          "FORMAT classifier (no cryptography yet, codex x2d00 P0): v0 → current_registry_only; v1 strongest → temporal_candidate. Never a proof.",
      },
      null,
      2,
    ));
    return;
  }
  // codex P0.1: parse flags correctly — a leading non-flag positional is the dir,
  // and `--json` is a flag, never the scan path.
  const positional = args.slice(1).find((a) => !a.startsWith("--"));
  const root = dirname(dirname(fromFileUrl(import.meta.url)));
  const dir = positional ?? join(dirname(root), "src");
  const tally: Record<string, number> = {};
  let signed = 0;
  for await (const path of walk(dir)) {
    const covers = coversOf(await Deno.readTextFile(path));
    if (covers === null) continue;
    signed++;
    const v = await classifyStanding({ covers });
    tally[v.standing] = (tally[v.standing] ?? 0) + 1;
  }
  console.log(JSON.stringify(
    {
      type: "temporal_standing",
      position: "2/F6",
      scope: dir,
      signed,
      proof_complete: false,
      standing: tally,
      note: (tally.current_registry_only ?? 0) === signed && signed > 0
        ? "All current signatures are v0 (current_registry_only): bind no time and are NOT historically anchored. This is a FORMAT classification — cryptographic verification of any signature is the verifier's job, not this scan. Historical anchoring requires v1 temporal signatures + a verified anchor proof (architect custody)."
        : "FORMAT classification only — see codex x2d00 for the verification pipeline",
    },
    null,
    2,
  ));
}

if (import.meta.main) await runCli();
