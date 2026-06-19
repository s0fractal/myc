#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
// myc/src/x2F90_temporal_sign.ts — emit a Temporal Signature Envelope (codex P3 step 1).
// position: 2/F.9 → mirror × bridge, the act of making a temporally-bindable signature.
//
// codex P3: emit one real v1 envelope using ONLY the signer's own key, verify it as
// temporal_unanchored, and produce the EXACT subject digest to hand to an external
// OpenTimestamps ceremony. This is NOT custody: each voice signs its OWN key here,
// exactly as it signs a chord. The custody acts — submitting the subject to OTS
// (network spend) and the Bitcoin anchoring — are the architect's ceremony and are
// deliberately NOT performed here. The envelope is non-circular (it binds no anchor),
// so the same signed bytes are later attested without rewriting.

import {
  canonicalEnvelopePayload,
  envelopeCommitment,
  SIGNATURE_DOMAIN,
  type TemporalSignatureEnvelope,
} from "./x2F60_temporal_envelope.ts";
import { signCommitment, voiceFamily } from "./x2F50_voice_auth.ts";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";

const MYC_ROOT = dirname(dirname(fromFileUrl(import.meta.url)));

export interface EmitResult {
  ok: boolean;
  envelope?: TemporalSignatureEnvelope;
  signature?: string;
  envelope_commitment?: string;
  subject_for_ots?: string; // exactly what to submit to OpenTimestamps
  reason: string;
}

export interface WrittenTemporalArtifact {
  envelope_path: string;
  signature_path: string;
  standing: "temporal_unanchored";
  proof_complete: false;
}

/** Build + sign a Temporal Signature Envelope with the signer's OWN key. Pure except
 *  for the signature, which reads the signer's local private key (its own act). */
export async function emitTemporalSignature(
  descriptor_commitment: string,
  signer: string,
  key_timeline_root: string,
  nonce: string,
): Promise<EmitResult> {
  if (!descriptor_commitment || !key_timeline_root || !nonce) {
    return {
      ok: false,
      reason: "descriptor_commitment, key_timeline_root and nonce are required",
    };
  }
  const envelope: TemporalSignatureEnvelope = {
    domain: SIGNATURE_DOMAIN,
    descriptor_commitment,
    signer: voiceFamily(signer),
    key_timeline_root,
    nonce,
  };
  const commitment = await envelopeCommitment(envelope);
  const signature = await signCommitment(voiceFamily(signer), commitment);
  if (!signature) {
    return {
      ok: false,
      envelope,
      envelope_commitment: commitment,
      reason: `no local private key for '${
        voiceFamily(signer)
      }' — only the voice itself can emit its envelope`,
    };
  }
  return {
    ok: true,
    envelope,
    signature,
    envelope_commitment: commitment,
    subject_for_ots: `sha256:${commitment}`,
    reason:
      "v1 envelope signed with the signer's own key — temporal_unanchored until an OTS ceremony anchors `subject_for_ots`",
  };
}

/** Persist the exact signed payload bytes plus a detached signature record. The
 *  envelope file intentionally has NO trailing newline: its file sha256 equals
 *  `envelope_commitment`, so `ots stamp <envelope_path>` attests exactly
 *  `subject_for_ots` rather than a second hash of a textual digest. */
export async function writeTemporalArtifact(
  result: EmitResult,
  slug: string,
  root = MYC_ROOT,
): Promise<WrittenTemporalArtifact> {
  if (
    !result.ok || !result.envelope || !result.signature ||
    !result.envelope_commitment || !result.subject_for_ots
  ) {
    throw new Error("cannot persist an incomplete temporal signature");
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(slug)) {
    throw new Error("--write slug must be 1-81 lowercase safe characters");
  }
  const dir = join(root, "public", "temporal");
  await Deno.mkdir(dir, { recursive: true });
  const envelope_path = join(dir, `${slug}.envelope.json`);
  const signature_path = join(dir, `${slug}.signature.json`);
  await Deno.writeTextFile(
    envelope_path,
    canonicalEnvelopePayload(result.envelope),
  );
  await Deno.writeTextFile(
    signature_path,
    JSON.stringify(
      {
        type: "TemporalSignatureArtifact.v1",
        envelope_file: `${slug}.envelope.json`,
        envelope_commitment: result.envelope_commitment,
        signature: result.signature,
        subject_for_ots: result.subject_for_ots,
        standing: "temporal_unanchored",
        proof_complete: false,
      },
      null,
      2,
    ) + "\n",
  );
  return {
    envelope_path,
    signature_path,
    standing: "temporal_unanchored",
    proof_complete: false,
  };
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : undefined;
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const descriptor = flag(args, "descriptor");
  const actor = flag(args, "actor");
  const timelineRoot = flag(args, "timeline-root");
  const nonce = flag(args, "nonce") ?? crypto.randomUUID();
  const writeSlug = flag(args, "write");
  if (!descriptor || !timelineRoot || !actor) {
    console.log(JSON.stringify(
      {
        type: "temporal_sign",
        position: "2/F9",
        usage:
          "temporal-sign --descriptor <commitment> --timeline-root <hash> --actor <voice> [--nonce <n>] [--write <slug>]",
        note:
          "signs a v1 envelope with the actor's OWN key. timeline-root is the genesis registry commitment the key was selected under. Submitting subject_for_ots to OpenTimestamps + anchoring is the architect's custody ceremony.",
      },
      null,
      2,
    ));
    Deno.exitCode = 1;
    return;
  }
  const r = await emitTemporalSignature(descriptor, actor, timelineRoot, nonce);
  let artifact: WrittenTemporalArtifact | undefined;
  if (r.ok && writeSlug) {
    try {
      artifact = await writeTemporalArtifact(r, writeSlug);
    } catch (e) {
      console.error(`# error: ${(e as Error).message}`);
      Deno.exitCode = 1;
      return;
    }
  }
  console.log(
    JSON.stringify(
      { type: "temporal_sign", position: "2/F9", ...r, artifact },
      null,
      2,
    ),
  );
  if (!r.ok) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
