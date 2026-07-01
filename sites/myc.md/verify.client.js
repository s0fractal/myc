// ../../src/shared/canonical_cbor.ts
function encodeCanonical(value) {
  const out = [];
  encodeValue(value, out);
  return new Uint8Array(out);
}
function encodeValue(v, out) {
  if (v === null) {
    out.push(246);
    return;
  }
  if (v === true) {
    out.push(245);
    return;
  }
  if (v === false) {
    out.push(244);
    return;
  }
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      throw new Error("canonical-cbor: non-finite number forbidden");
    }
    if (!Number.isInteger(v)) {
      throw new Error(
        "canonical-cbor: floats forbidden (use Q-format integers)"
      );
    }
    if (!Number.isSafeInteger(v)) {
      throw new Error("canonical-cbor: integer out of safe range; use bigint");
    }
    encodeIntNum(v, out);
    return;
  }
  if (typeof v === "bigint") {
    encodeIntBig(v, out);
    return;
  }
  if (typeof v === "string") {
    const bytes = new TextEncoder().encode(v);
    encodeHead(3, bytes.length, out);
    pushAll(out, bytes);
    return;
  }
  if (v instanceof Uint8Array) {
    encodeHead(2, v.length, out);
    pushAll(out, v);
    return;
  }
  if (Array.isArray(v)) {
    encodeHead(4, v.length, out);
    for (const item of v) encodeValue(item, out);
    return;
  }
  if (typeof v === "object" && v !== null) {
    if (v instanceof Map) {
      throw new Error("canonical-cbor: JS Map forbidden; use plain object");
    }
    if (v instanceof Set) throw new Error("canonical-cbor: JS Set forbidden");
    const obj = v;
    const keys = Object.keys(obj);
    const encoded = keys.map((k) => {
      const tmp = [];
      const kb = new TextEncoder().encode(k);
      encodeHead(3, kb.length, tmp);
      pushAll(tmp, kb);
      return { key: k, bytes: new Uint8Array(tmp) };
    });
    encoded.sort((a, b) => compareBytes(a.bytes, b.bytes));
    for (let i = 1; i < encoded.length; i++) {
      if (compareBytes(encoded[i - 1].bytes, encoded[i].bytes) === 0) {
        throw new Error(
          `canonical-cbor: duplicate map key after encoding: ${encoded[i].key}`
        );
      }
    }
    encodeHead(5, encoded.length, out);
    for (const { key, bytes } of encoded) {
      pushAll(out, bytes);
      encodeValue(obj[key], out);
    }
    return;
  }
  throw new Error(`canonical-cbor: unsupported value type: ${typeof v}`);
}
function encodeIntNum(n, out) {
  if (n >= 0 && n < 4294967296) {
    encodeHead(0, n, out);
    return;
  }
  if (n < 0 && -1 - n < 4294967296) {
    encodeHead(1, -1 - n, out);
    return;
  }
  encodeIntBig(BigInt(n), out);
}
function encodeIntBig(n, out) {
  if (n >= 0n) {
    if (n < 0x100000000n) {
      encodeHead(0, Number(n), out);
      return;
    }
    if (n > 0xffffffffffffffffn) {
      throw new Error("canonical-cbor: uint > u64 forbidden");
    }
    out.push(27);
    for (let i = 7; i >= 0; i--) out.push(Number(n >> BigInt(i * 8) & 0xffn));
    return;
  }
  const negated = -1n - n;
  if (negated < 0x100000000n) {
    encodeHead(1, Number(negated), out);
    return;
  }
  if (negated > 0xffffffffffffffffn) {
    throw new Error("canonical-cbor: negint < -2^64 forbidden");
  }
  out.push(59);
  for (let i = 7; i >= 0; i--) {
    out.push(Number(negated >> BigInt(i * 8) & 0xffn));
  }
}
function encodeHead(major, value, out) {
  const m = major << 5 & 255;
  if (value < 0) throw new Error("canonical-cbor: negative head argument");
  if (value < 24) {
    out.push(m | value);
  } else if (value < 256) {
    out.push(m | 24, value & 255);
  } else if (value < 65536) {
    out.push(m | 25, value >> 8 & 255, value & 255);
  } else if (value < 4294967296) {
    out.push(
      m | 26,
      value >>> 24 & 255,
      value >> 16 & 255,
      value >> 8 & 255,
      value & 255
    );
  } else {
    throw new Error("canonical-cbor: value too large; use bigint for >= 2^32");
  }
}
function pushAll(out, bytes) {
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}
function compareBytes(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}
async function multihashSha256(bytes) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", bytes)
  );
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return "1220" + hex;
}
function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// verify.client.ts
var RAW = "https://raw.githubusercontent.com/s0fractal/trinity/main/probes/external-trust-verifier-v0";
var REGISTRY_URL = "https://raw.githubusercontent.com/s0fractal/trinity/main/src/x2F38_voice_pubkeys.json";
var unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
var encU = (s) => new TextEncoder().encode(s);
async function sha256Prefixed(s) {
  const d = await crypto.subtle.digest("SHA-256", encU(s));
  return "sha256:" + toHex(new Uint8Array(d));
}
async function ed25519Verify(pub, msg, sig) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      pub,
      "Ed25519",
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      sig,
      msg
    );
  } catch {
    const noble = await import("https://esm.sh/@noble/ed25519@2.1.0");
    return await noble.verifyAsync(sig, msg, pub);
  }
}
async function verifyAttestation(url) {
  const [registry, artifact] = await Promise.all([
    fetch(REGISTRY_URL).then((r) => r.json()),
    fetch(url).then((r) => r.json())
  ]);
  const { signed_payload, attestation } = artifact;
  const checks = [];
  const digest = await sha256Prefixed(signed_payload);
  checks.push({
    name: "the signed bundle was not altered after signing",
    ok: digest === attestation.payload
  });
  const pub = registry.keys?.[attestation.voice]?.pubkey;
  const sigOk = pub ? await ed25519Verify(
    unb64(pub),
    encU(attestation.payload),
    unb64(attestation.sig)
  ) : false;
  checks.push({
    name: `signed by "${attestation.voice}" \u2014 a voice in the public key registry`,
    ok: sigOk
  });
  const { verdict, envelopes, attested_at } = JSON.parse(signed_payload);
  let recomputed = 0;
  const laws = [];
  for (const e of envelopes) {
    const got = await multihashSha256(encodeCanonical(e.body));
    if (got === e.body_hash) recomputed++;
    if (e.law_hash) laws.push(e.law_hash);
  }
  checks.push({
    name: `every body_hash recomputed from the raw bodies (${recomputed}/${envelopes.length})`,
    ok: recomputed === envelopes.length,
    detail: envelopes.map((e) => e.substrate_tag).join(", ")
  });
  const uniqueLaws = [...new Set(laws)];
  const lawAgree = uniqueLaws.length <= 1;
  checks.push({
    name: `the substrates agree on the same law`,
    ok: lawAgree,
    detail: uniqueLaws.join(", ")
  });
  const conflicts = verdict?.court?.conflicts?.length ?? 0;
  const ourAgreement = recomputed === envelopes.length && lawAgree && conflicts === 0;
  checks.push({
    name: "the court's agreement, re-derived here, matches what was published",
    ok: ourAgreement === verdict?.court?.agreement,
    detail: `re-derived ${ourAgreement}`
  });
  return {
    checks,
    allOk: checks.every((c) => c.ok),
    attestedAt: attested_at
  };
}
var doc = globalThis.document;
if (doc) {
  const out = doc.getElementById("result");
  const render = (title, r) => {
    if (!out) return;
    const rows = r.checks.map(
      (c) => `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "\u2713" : "\u2717"} ${c.name}${c.detail ? ` <span class="d">(${c.detail})</span>` : ""}</li>`
    ).join("");
    const asOf = r.attestedAt ? `<p class="d">court verdict as of ${r.attestedAt} \u2014 a receipt of that moment, not a live feed</p>` : "";
    out.innerHTML = `<h2 class="${r.allOk ? "ok" : "bad"}">${title}: ${r.allOk ? "CONFIRMED \u2014 verified in your browser, trusting no one" : "REJECTED"}</h2>${asOf}<ul>${rows}</ul>`;
  };
  const btn = doc.getElementById("verify");
  if (btn) {
    btn.onclick = async () => {
      if (out) out.innerHTML = "<p>fetching public bytes + recomputing\u2026</p>";
      render(
        "Live court attestation",
        await verifyAttestation(`${RAW}/court-attestation.json`)
      );
    };
  }
  const tbtn = doc.getElementById("verify-tampered");
  if (tbtn) {
    tbtn.onclick = async () => {
      if (out) {
        out.innerHTML = "<p>verifying the tampered fixture (must be rejected)\u2026</p>";
      }
      render(
        "Tampered fixture",
        await verifyAttestation(`${RAW}/court-attestation.tampered.json`)
      );
    };
  }
}
export {
  verifyAttestation
};
