#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env
// myc/src/x2FA0_temporal_verify.ts — end-to-end temporal verification (codex x2d00).
// position: 2/F.A → mirror × bridge, the whole proof chain in one honest verdict.
//
// codex's pipeline: "expose independent dimensions; never collapse them into one
// historical_v1 enum; return a typed verdict with evidence." This composes the
// pieces — the persisted envelope (x2F60), the signer's signature (x2F50), and an
// OpenTimestamps anchor (x2F80) — and reports EACH edge separately:
//
//   envelope_integrity  ->  signature_valid  ->  subject_matches  ->  anchor_verify
//
// `fully_anchored` is the honest conjunction of all real checks — never a label
// emitted before each edge actually verified. Useful NOW (codex's unanchored
// envelope verifies its signature, anchor absent) and after the architect's OTS
// ceremony (the same immutable bytes verify as anchored, behind a Bitcoin source).

import { verifyCommitment } from "./x2F50_voice_auth.ts";
import { sha256Hex } from "./verify_core.ts";
import {
  classifyStanding,
  type TemporalAnchorReceipt,
} from "./x2F60_temporal_envelope.ts";
import { verifyOtsProof } from "./x2F80_ots_adapter.ts";

export interface TemporalVerdict {
  ok: boolean;
  envelope_commitment: string | null;
  signer: string | null;
  /** the signer's registered key signed exactly this envelope commitment. */
  signature_valid: boolean;
  /** null when no anchor was supplied. */
  anchor:
    | {
      subject_matches: boolean; // the proof attests THIS envelope commitment
      verify: "valid" | "invalid" | "unavailable"; // the on-chain `ots verify`
      bitcoin_block_heights: number[];
    }
    | null;
  standing: string;
  /** the honest conjunction: signed AND the anchor proves this subject on-chain. */
  fully_anchored: boolean;
  reason: string;
}

/** Verify a persisted temporal artifact end to end. The envelope file's bytes hash
 *  to the commitment the signature covers; an optional .ots anchor must attest that
 *  exact commitment and pass `ots verify`. Fail closed at every edge. */
export async function verifyTemporal(
  envelopePath: string,
  signature: string,
  anchorPath?: string,
  bitcoinNode?: string,
): Promise<TemporalVerdict> {
  let envelopeBytes: Uint8Array;
  try {
    envelopeBytes = await Deno.readFile(envelopePath);
  } catch {
    return {
      ok: false,
      envelope_commitment: null,
      signer: null,
      signature_valid: false,
      anchor: null,
      standing: "unavailable",
      fully_anchored: false,
      reason: `cannot read envelope ${envelopePath}`,
    };
  }
  const commitment = await sha256Hex(envelopeBytes);
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(new TextDecoder().decode(envelopeBytes));
  } catch {
    return {
      ok: false,
      envelope_commitment: commitment,
      signer: null,
      signature_valid: false,
      anchor: null,
      standing: "malformed",
      fully_anchored: false,
      reason: "envelope file is not valid JSON",
    };
  }
  const signer = typeof envelope.signer === "string" ? envelope.signer : null;

  // edge 1: the signer's registered key signed exactly this commitment.
  const sigCheck = signer
    ? await verifyCommitment(signer, commitment, signature)
    : null;
  const signature_valid = sigCheck === true;

  // edge 2+3: an OTS anchor (optional) must attest THIS subject and verify on-chain.
  let anchor: TemporalVerdict["anchor"] = null;
  let anchorReceipt: TemporalAnchorReceipt | undefined;
  if (anchorPath) {
    const ots = await verifyOtsProof(anchorPath, {
      verify: true,
      expectedSubject: `sha256:${commitment}`,
      bitcoinNode,
    });
    const subject_matches = ots.subject_digest === commitment;
    anchor = {
      subject_matches,
      verify: ots.verify,
      bitcoin_block_heights: ots.bitcoin_block_heights,
    };
    if (subject_matches && ots.bitcoin_block_heights.length > 0) {
      anchorReceipt = {
        type: "TemporalAnchorReceipt.v1",
        subject: `sha256:${commitment}`,
        proof_kind: "opentimestamps",
        proof_commitment: `sha256:${commitment}`,
        bitcoin_block_height: ots.bitcoin_block_heights[0],
        bitcoin_block_hash: "",
        verifier: ots.verifier_version ?? "ots",
      };
    }
  }

  const stand = await classifyStanding(
    { covers: "envelope.v1", envelope },
    anchorReceipt ? { anchor_receipt: anchorReceipt } : undefined,
  );

  const fully_anchored = signature_valid && anchor?.subject_matches === true &&
    anchor?.verify === "valid";

  return {
    ok: signature_valid,
    envelope_commitment: commitment,
    signer,
    signature_valid,
    anchor,
    standing: stand.standing,
    fully_anchored,
    reason: !signer
      ? "envelope has no signer"
      : sigCheck === null
      ? "signer key unavailable in the registry — signature unverifiable"
      : !signature_valid
      ? "signature does not verify for this signer over this commitment"
      : fully_anchored
      ? "signed and anchored on-chain for this exact subject"
      : anchor
      ? "signature valid; anchor not yet proven (subject mismatch, invalid, or unavailable)"
      : "signature valid; temporal_unanchored (no anchor supplied)",
  };
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const positional = args.filter((a) => !a.startsWith("--"));
  const envelopePath = positional[0];
  const anchorIdx = args.indexOf("--anchor");
  const anchorPath = anchorIdx >= 0 ? args[anchorIdx + 1] : undefined;
  const nodeIdx = args.indexOf("--bitcoin-node");
  const bitcoinNode = nodeIdx >= 0 ? args[nodeIdx + 1] : undefined;
  const sigIdx = args.indexOf("--signature");
  // signature may be passed inline (--signature <b64>) or read from a sidecar file.
  let signature = sigIdx >= 0 ? args[sigIdx + 1] : undefined;
  if (!signature && envelopePath) {
    const sidecar = envelopePath.replace(
      /\.envelope\.json$/,
      ".signature.json",
    );
    try {
      signature = JSON.parse(await Deno.readTextFile(sidecar)).signature;
    } catch { /* none */ }
  }
  if (!envelopePath || !signature) {
    console.log(JSON.stringify(
      {
        type: "temporal_verify",
        position: "2/FA",
        usage:
          "temporal-verify <envelope.json> [--signature <b64> | sidecar .signature.json] [--anchor <proof.ots>]",
        note:
          "reports each edge independently (signature / subject / anchor); fully_anchored is their honest conjunction.",
      },
      null,
      2,
    ));
    Deno.exitCode = 1;
    return;
  }
  const v = await verifyTemporal(
    envelopePath,
    signature,
    anchorPath,
    bitcoinNode,
  );
  console.log(
    JSON.stringify(
      { type: "temporal_verify", position: "2/FA", ...v },
      null,
      2,
    ),
  );
  if (!v.ok) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
