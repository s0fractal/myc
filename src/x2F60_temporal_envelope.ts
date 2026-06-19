// myc/src/x2F60_temporal_envelope.ts — Temporal Trust Envelope v1 (format + standing).
// position: 2/F.6 → mirror × bridge, the time a signature was actually made.
//
// codex x6d00_954417 P0. A v0 content_sig covers only the body commitment:
//
//   content_sig: { voice, alg, covers: "commitment", sig }
//
// It binds NO time, so it can never be historically verified — an editable or
// self-asserted anchor could move a signature to a moment before a revocation, and
// the (already-built) key timeline x2B00 has nothing on the descriptor to evaluate
// `keyStateAt` against. The v1 envelope closes that gap by signing a domain-
// separated payload that binds the descriptor commitment, the signing anchor, and
// the exact key-timeline snapshot used to select the key.
//
// THIS SLICE IS VERIFICATION-ONLY and does NOT change live signing (x2F50). It
// specifies the envelope, its commitment, and the STANDING a signature may claim —
// fail closed. The `valid_at_signing` / `trusted_now` resolution against the key
// timeline arrives when the pure timeline verifier becomes MYC-resident (codex
// step 4). Minting, rotation, recovery and fork adjudication remain human custody.

import { type KeyEvent, resolveKeyState } from "./x2F70_keytimeline.ts";

export const ENVELOPE_DOMAIN = "myc.content-sig.v1";

/** A signing anchor: an external time reference. It is historical proof ONLY with an
 *  independently verified inclusion_receipt — a bare height is self-asserted. */
export interface SigningAnchor {
  kind: "bitcoin_block" | string;
  height: number;
  inclusion_receipt?: string;
}

/** The v1 envelope — the EXACT payload the signature covers (not just the commitment). */
export interface TemporalEnvelopeV1 {
  domain: string; // must equal ENVELOPE_DOMAIN
  descriptor_commitment: string;
  signer: string;
  signing_anchor: SigningAnchor;
  key_timeline_root: string; // the verified event snapshot used to select the key
}

/** The standing a signature may honestly claim. Ordered weakest→strongest only by
 *  meaning, never by a score: standing is categorical, never a heuristic. */
export type Standing =
  | "unavailable" // v1 but no anchor verifier/bundle supplied — never pass, not invalid
  | "self_asserted" // v1 whose anchor lacks an independently verified inclusion receipt
  | "current_registry_only" // v0 — verifiable vs the CURRENT registry, never historically
  | "historical_v1"; // v1 with a verified anchor — eligible for valid_at_signing (step 4)

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

/** The commitment the v1 signature covers — the stable encoding of the WHOLE
 *  envelope. Changing the anchor height, the timeline root, or the descriptor
 *  commitment changes this value, so a v1 signature cannot be replayed to another
 *  time or another timeline snapshot (codex acceptance 1 & 2). */
export async function envelopeCommitment(
  env: TemporalEnvelopeV1,
): Promise<string> {
  return await sha256(stable({
    descriptor_commitment: env.descriptor_commitment,
    domain: env.domain,
    key_timeline_root: env.key_timeline_root,
    signer: env.signer,
    signing_anchor: {
      height: env.signing_anchor.height,
      inclusion_receipt: env.signing_anchor.inclusion_receipt ?? null,
      kind: env.signing_anchor.kind,
    },
  }));
}

/** Validate the structural shape of a v1 envelope. Fail closed. */
export function validateEnvelope(
  v: unknown,
): { ok: true; env: TemporalEnvelopeV1 } | { ok: false; error: string } {
  if (!v || typeof v !== "object") {
    return { ok: false, error: "envelope must be an object" };
  }
  const o = v as Record<string, unknown>;
  if (o.domain !== ENVELOPE_DOMAIN) {
    return { ok: false, error: `domain must be ${ENVELOPE_DOMAIN}` };
  }
  if (typeof o.descriptor_commitment !== "string" || !o.descriptor_commitment) {
    return {
      ok: false,
      error: "descriptor_commitment must be a non-empty string",
    };
  }
  if (typeof o.signer !== "string" || !o.signer) {
    return { ok: false, error: "signer must be a non-empty string" };
  }
  if (typeof o.key_timeline_root !== "string" || !o.key_timeline_root) {
    return { ok: false, error: "key_timeline_root must be a non-empty string" };
  }
  const a = o.signing_anchor as Record<string, unknown> | undefined;
  if (
    !a || typeof a !== "object" || typeof a.kind !== "string" ||
    typeof a.height !== "number"
  ) {
    return {
      ok: false,
      error: "signing_anchor must have a string kind and numeric height",
    };
  }
  return {
    ok: true,
    env: {
      domain: o.domain,
      descriptor_commitment: o.descriptor_commitment,
      signer: o.signer,
      key_timeline_root: o.key_timeline_root,
      signing_anchor: {
        kind: a.kind,
        height: a.height,
        inclusion_receipt: typeof a.inclusion_receipt === "string"
          ? a.inclusion_receipt
          : undefined,
      },
    },
  };
}

/** The injected trust bundle (codex: registry genesis + event bundle + verified
 *  anchor receipts are passed EXPLICITLY; MYC never searches ambient paths or
 *  imports its parent). For this slice only the verified-anchor set is consulted. */
export interface TrustBundle {
  /** inclusion_receipt ids that have been INDEPENDENTLY verified. */
  verified_anchor_receipts?: string[];
  /** the key-event timeline (the verified snapshot named by key_timeline_root), so
   *  a historical signature can be resolved to valid_at_signing / trusted_now. */
  timeline_events?: KeyEvent[];
}

export interface StandingVerdict {
  standing: Standing;
  reason: string;
  signer?: string;
  envelope_commitment?: string;
  /** present only for historical_v1 with a supplied timeline: was the signer's key
   *  active at the bound anchor, and is it still trusted? (codex step 4) */
  valid_at_signing?: boolean;
  trusted_now?: boolean;
  signing_key?: string | null;
}

/** Classify the standing a content_sig may honestly claim. Fail closed: a v1
 *  envelope whose anchor receipt is not in the supplied verified set is
 *  `self_asserted` (never historical); a v1 envelope with no bundle at all is
 *  `unavailable` (never pass); a v0 signature is `current_registry_only` and must
 *  never be reported as historically verified. */
export async function classifyStanding(
  contentSig: { covers?: string; envelope?: unknown },
  bundle?: TrustBundle | null,
): Promise<StandingVerdict> {
  // v0 — signs only the commitment, binds no time.
  if (contentSig.covers === "commitment" || !contentSig.envelope) {
    return {
      standing: "current_registry_only",
      reason:
        "v0 signature binds no signing anchor — verifiable against the current registry, never historically",
    };
  }
  const v = validateEnvelope(contentSig.envelope);
  if (!v.ok) {
    return {
      standing: "unavailable",
      reason: `malformed v1 envelope: ${v.error}`,
    };
  }
  const env = v.env;
  const commitment = await envelopeCommitment(env);
  const receipt = env.signing_anchor.inclusion_receipt;
  if (!bundle || !bundle.verified_anchor_receipts) {
    return {
      standing: "unavailable",
      reason:
        "no anchor verifier bundle supplied — cannot establish historical trust",
      signer: env.signer,
      envelope_commitment: commitment,
    };
  }
  if (!receipt || !bundle.verified_anchor_receipts.includes(receipt)) {
    return {
      standing: "self_asserted",
      reason:
        "signing anchor has no independently verified inclusion receipt — a self-asserted time is not historical proof",
      signer: env.signer,
      envelope_commitment: commitment,
    };
  }
  // anchor independently verified → resolve the signer's key state AT the bound
  // anchor against the supplied timeline (step 4: the verifier is MYC-resident).
  const verdict: StandingVerdict = {
    standing: "historical_v1",
    reason: "anchor independently verified",
    signer: env.signer,
    envelope_commitment: commitment,
  };
  if (bundle.timeline_events) {
    const ks = resolveKeyState(bundle.timeline_events, env.signer, {
      kind: "bitcoin_block",
      height: env.signing_anchor.height,
    });
    verdict.valid_at_signing = ks.valid_at_signing;
    verdict.trusted_now = ks.trusted_now;
    verdict.signing_key = ks.signing_key;
    verdict.reason = `anchor verified; ${ks.reason}`;
  } else {
    verdict.reason =
      "anchor verified, but no timeline supplied — valid_at_signing unresolved";
  }
  return verdict;
}
