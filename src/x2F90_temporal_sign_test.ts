import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emitTemporalSignature,
  writeTemporalArtifact,
} from "./x2F90_temporal_sign.ts";
import {
  canonicalEnvelopePayload,
  SIGNATURE_DOMAIN,
} from "./x2F60_temporal_envelope.ts";

Deno.test("temporal-sign — builds a well-formed non-circular envelope; honest with/without a key", async () => {
  const r = await emitTemporalSignature(
    "sha256:dddd",
    "claude",
    "sha256:genesis",
    "nonce-1",
  );
  // the envelope is well-formed and binds NO anchor (non-circular) regardless of key.
  assertEquals(r.envelope?.domain, SIGNATURE_DOMAIN);
  assertEquals(r.envelope?.signer, "claude");
  assertEquals(r.envelope?.descriptor_commitment, "sha256:dddd");
  assert(!("signing_anchor" in (r.envelope ?? {})));
  assert(
    typeof r.envelope_commitment === "string" &&
      r.envelope_commitment!.length === 64,
  );
  // ok iff the signer's own key is present (CI: no key → fail closed, no fabricated sig).
  if (r.ok) {
    assert(
      r.signature && r.subject_for_ots === `sha256:${r.envelope_commitment}`,
    );
  } else {
    assertEquals(r.signature, undefined);
    assert(
      r.reason.includes("no local private key") ||
        r.reason.includes("required"),
    );
  }
});

Deno.test("temporal-sign — fails closed on missing inputs", async () => {
  assertEquals((await emitTemporalSignature("", "claude", "r", "n")).ok, false);
  assertEquals((await emitTemporalSignature("d", "claude", "", "n")).ok, false);
});

Deno.test("temporal-sign — canonical envelope bytes hash to subject_for_ots", async () => {
  const r = await emitTemporalSignature(
    `sha256:${"d".repeat(64)}`,
    "claude",
    `sha256:${"a".repeat(64)}`,
    "nonce-canonical",
  );
  assert(r.envelope && r.envelope_commitment);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalEnvelopePayload(r.envelope)),
  );
  const hex = Array.from(new Uint8Array(digest)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  assertEquals(hex, r.envelope_commitment);
});

Deno.test("temporal-sign — persisted envelope is exact OTS subject when a key exists", async () => {
  const r = await emitTemporalSignature(
    `sha256:${"d".repeat(64)}`,
    "claude",
    `sha256:${"a".repeat(64)}`,
    "nonce-write",
  );
  if (!r.ok) return; // CI intentionally has no private key.
  const root = await Deno.makeTempDir();
  const a = await writeTemporalArtifact(r, "claude-test", root);
  assertEquals(
    await Deno.readTextFile(a.envelope_path),
    canonicalEnvelopePayload(r.envelope!),
  );
  assertEquals(a.standing, "temporal_unanchored");
  assertEquals(a.proof_complete, false);
});
