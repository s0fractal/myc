// Browser-side external verifier — the lowest bar of "verify us without trusting
// us": a stranger opens myc.md/verify and confirms the federation's Substrate Court
// verdict IN THEIR OWN BROWSER, fetching only public bytes (raw GitHub), recomputing
// every body_hash themselves with the same canonical encoder, and verifying the
// signature with the browser's own crypto. Nothing of ours runs but public code the
// stranger fetched; no secret, no server-side "trust me". Bundled to verify.client.js
// by esbuild (a real module, never a template literal — byte-exact encoder). The
// encoder is myc's own vendored copy, parity-guarded byte-identical to the source.
import {
  encodeCanonical,
  multihashSha256,
  toHex,
} from "../../src/shared/canonical_cbor.ts";

const RAW =
  "https://raw.githubusercontent.com/s0fractal/trinity/main/probes/external-trust-verifier-v0";
const REGISTRY_URL =
  "https://raw.githubusercontent.com/s0fractal/trinity/main/src/x2F38_voice_pubkeys.json";

const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const encU = (s: string) => new TextEncoder().encode(s);

async function sha256Prefixed(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", encU(s) as BufferSource);
  return "sha256:" + toHex(new Uint8Array(d));
}

// The browser's own ed25519, with a noble fallback for engines that lack it in
// WebCrypto — either way it is standard ed25519 the stranger can audit, not ours.
async function ed25519Verify(
  pub: Uint8Array,
  msg: Uint8Array,
  sig: Uint8Array,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      pub as BufferSource,
      "Ed25519",
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      sig as BufferSource,
      msg as BufferSource,
    );
  } catch {
    const noble = await import("https://esm.sh/@noble/ed25519@2.1.0");
    return await noble.verifyAsync(sig, msg, pub);
  }
}

export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function verifyAttestation(
  url: string,
): Promise<{ checks: Check[]; allOk: boolean; attestedAt?: string }> {
  const [registry, artifact] = await Promise.all([
    fetch(REGISTRY_URL).then((r) => r.json()),
    fetch(url).then((r) => r.json()),
  ]);
  const { signed_payload, attestation } = artifact;
  const checks: Check[] = [];

  const digest = await sha256Prefixed(signed_payload);
  checks.push({
    name: "the signed bundle was not altered after signing",
    ok: digest === attestation.payload,
  });

  const pub = registry.keys?.[attestation.voice]?.pubkey;
  const sigOk = pub
    ? await ed25519Verify(
      unb64(pub),
      encU(attestation.payload),
      unb64(attestation.sig),
    )
    : false;
  checks.push({
    name:
      `signed by "${attestation.voice}" — a voice in the public key registry`,
    ok: sigOk,
  });

  const { verdict, envelopes, attested_at } = JSON.parse(signed_payload);
  let recomputed = 0;
  const laws: string[] = [];
  for (const e of envelopes) {
    const got = await multihashSha256(encodeCanonical(e.body));
    if (got === e.body_hash) recomputed++;
    if (e.law_hash) laws.push(e.law_hash);
  }
  checks.push({
    name:
      `every body_hash recomputed from the raw bodies (${recomputed}/${envelopes.length})`,
    ok: recomputed === envelopes.length,
    detail: envelopes.map((e: { substrate_tag: string }) => e.substrate_tag)
      .join(", "),
  });

  const uniqueLaws = [...new Set(laws)];
  const lawAgree = uniqueLaws.length <= 1;
  checks.push({
    name: `the substrates agree on the same law`,
    ok: lawAgree,
    detail: uniqueLaws.join(", "),
  });

  const conflicts = verdict?.court?.conflicts?.length ?? 0;
  const ourAgreement = recomputed === envelopes.length && lawAgree &&
    conflicts === 0;
  checks.push({
    name: "the court's agreement, re-derived here, matches what was published",
    ok: ourAgreement === verdict?.court?.agreement,
    detail: `re-derived ${ourAgreement}`,
  });

  return {
    checks,
    allOk: checks.every((c) => c.ok),
    attestedAt: attested_at as string | undefined,
  };
}

// ── DOM wiring (only runs in a browser) ──────────────────────────────────────
// deno-lint-ignore no-explicit-any
const doc = (globalThis as any).document;
if (doc) {
  const out = doc.getElementById("result");
  const render = (
    title: string,
    r: { checks: Check[]; allOk: boolean; attestedAt?: string },
  ) => {
    if (!out) return;
    const rows = r.checks.map((c: Check) =>
      `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"} ${c.name}${
        c.detail ? ` <span class="d">(${c.detail})</span>` : ""
      }</li>`
    ).join("");
    const asOf = r.attestedAt
      ? `<p class="d">court verdict as of ${r.attestedAt} — a receipt of that moment, not a live feed</p>`
      : "";
    out.innerHTML = `<h2 class="${r.allOk ? "ok" : "bad"}">${title}: ${
      r.allOk
        ? "CONFIRMED — verified in your browser, trusting no one"
        : "REJECTED"
    }</h2>${asOf}<ul>${rows}</ul>`;
  };
  const btn = doc.getElementById("verify");
  if (btn) {
    btn.onclick = async () => {
      if (out) out.innerHTML = "<p>fetching public bytes + recomputing…</p>";
      render(
        "Live court attestation",
        await verifyAttestation(`${RAW}/court-attestation.json`),
      );
    };
  }
  const tbtn = doc.getElementById("verify-tampered");
  if (tbtn) {
    tbtn.onclick = async () => {
      if (out) {
        out.innerHTML =
          "<p>verifying the tampered fixture (must be rejected)…</p>";
      }
      render(
        "Tampered fixture",
        await verifyAttestation(`${RAW}/court-attestation.tampered.json`),
      );
    };
  }
}
