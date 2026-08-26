// myc/src/x5820_action_intent.ts — the canonical ActionIntent contract.
// position: 5/8.2 → action × completion, the schema a proposal grants over.
//
// codex x6d00_954417 P0.5: the canonical ActionIntent schema/normalizer belongs in
// MYC, because a proposal's action_grant is a membrane contract and MYC must work
// standalone (it cannot import from its parent repository). Trinity's Actuation
// Warrant (x5E10) VENDORS a byte-identical copy of intentCommitment — the two are
// kept in lockstep by a shared known-answer vector tested on both sides (the omega-
// vendors-trinity-encoder pattern), NOT by a cross-substrate import, because Trinity
// CI runs without this submodule. One algorithm, two homes, pinned to one value.
//
// ADOPTION, 2026-08-26: the commitment is now SHA-256 over CNP-0-JCS canonical
// bytes — RFC-0003 Part 01 §5.1, Tranche A3, ratified. This is the first path in
// either substrate to compute a real `hsp-jcs@v0` reference rather than an
// ad-hoc stable stringification, and it was chosen because it is an authority
// gate: `actionBoundAuthority` permits actuation only when a committed
// proposal's intent_commitment equals this value exactly.
//
// The old digest is not accepted and there is no dual-hash path. No
// intent_commitment has ever been persisted — verified by search across the
// repository before the change — so there is no historical corpus to invalidate
// and a compatibility mode would only preserve a choice nobody made.
//
// Nothing else in this repository is migrated. The other `stable()` copies stay
// as they are; this is one slice, not a sweep.

/** A normalized action intent. requested_effects is a SET (canonical order);
 *  input_commitments order is SIGNIFICANT — [a,b] ≠ [b,a] (codex §5). */
export interface ActionIntent {
  verb: string;
  target_substrate: "trinity" | "myc" | "liquid" | "omega";
  args_commitment: string;
  input_commitments: string[];
  requested_effects: string[];
}

const SUBSTRATES = ["trinity", "myc", "liquid", "omega"];

/** The closed member set. An ActionIntent has exactly these and nothing else. */
const MEMBERS = [
  "verb",
  "target_substrate",
  "args_commitment",
  "input_commitments",
  "requested_effects",
] as const;

/** The ONE domain check. `validateIntent` and the canonical encoder both call
 *  it, because two guards that are supposed to agree and are written twice are
 *  two guards that will disagree.
 *
 *  An earlier version repeated only the surrogate check inside the encoder and
 *  described itself as "refusing anything else". It did not: a runtime value
 *  with `requested_effects: [1]` was encoded as the JSON number `1` and given a
 *  digest, despite `validateIntent` rejecting it. In an authority path a
 *  commitment must be unreachable for any value the boundary would refuse. */
function domainError(v: unknown): string | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return "intent must be an object";
  }
  const o = v as Record<string, unknown>;

  // Extra members are REJECTED, not dropped. Silently discarding an unknown
  // member means two different callers can commit to the same digest while
  // believing they asked for different things.
  const extra = Object.keys(o).filter(
    (k) => !(MEMBERS as readonly string[]).includes(k),
  ).sort();
  if (extra.length) {
    return `unknown member(s): ${
      extra.join(", ")
    }; the ActionIntent schema is closed`;
  }
  for (const k of MEMBERS) {
    if (!(k in o)) return `${k} is missing`;
  }

  if (typeof o.verb !== "string" || !o.verb.trim()) {
    return "verb must be a non-empty string";
  }
  if (
    typeof o.target_substrate !== "string" ||
    !SUBSTRATES.includes(o.target_substrate)
  ) {
    return `target_substrate must be one of: ${SUBSTRATES.join(", ")}`;
  }
  if (typeof o.args_commitment !== "string") {
    return "args_commitment must be a string";
  }
  for (const k of ["input_commitments", "requested_effects"] as const) {
    const a = o[k];
    if (!Array.isArray(a) || !a.every((e) => typeof e === "string")) {
      return `${k} must be an array of strings`;
    }
  }

  // Surrogates last, so a shape error is reported as a shape error.
  const strings: [string, string][] = [
    ["verb", o.verb as string],
    ["args_commitment", o.args_commitment as string],
    ...(o.input_commitments as string[]).map((
      x,
      i,
    ): [string, string] => [`input_commitments[${i}]`, x]),
    ...(o.requested_effects as string[]).map((
      x,
      i,
    ): [string, string] => [`requested_effects[${i}]`, x]),
  ];
  for (const [where, value] of strings) {
    const bad = unpairedSurrogateIndex(value);
    if (bad >= 0) {
      return `${where} contains an unpaired UTF-16 surrogate at index ${bad}; ` +
        `strict I-JSON admits only Unicode scalar values, and the string has no ` +
        `UTF-8 encoding a second implementation could reproduce`;
    }
  }
  return null;
}

/** Validate an untrusted value as an ActionIntent. Fail closed: anything
 *  missing, mistyped, carrying an unknown member, or holding an unpaired
 *  surrogate is rejected with a reason. */
export function validateIntent(
  v: unknown,
): { ok: true; intent: ActionIntent } | { ok: false; error: string } {
  const err = domainError(v);
  if (err) return { ok: false, error: err };
  const o = v as Record<string, unknown>;
  return {
    ok: true,
    intent: {
      verb: o.verb as string,
      target_substrate: o.target_substrate as ActionIntent["target_substrate"],
      args_commitment: o.args_commitment as string,
      input_commitments: o.input_commitments as string[],
      requested_effects: o.requested_effects as string[],
    },
  };
}

/** RFC-0003 Part 01 §5.1.2.1: the wire encoding and the numeric profile are
 *  separate identifiers and BOTH live inside the hashed root. A profile without
 *  a byte encoding does not determine a digest. */
export const CANONICAL_ENCODING = "hsp-jcs@v0";
export const NUMERIC_PROFILE = "cnp-0";

/** The index of the first unpaired UTF-16 surrogate, or -1.
 *
 *  Strict I-JSON admits only Unicode scalar values, and RFC-0003 §5.1.3 names
 *  `unpaired-surrogate` as a rejection class for exactly this. The reason is
 *  interoperability rather than anything local: a lone surrogate has no UTF-8
 *  encoding at all, so a second implementation cannot reproduce the commitment.
 *  Python raises `UnicodeEncodeError` on `'x\ud834y'.encode('utf-8')`; Rust
 *  cannot hold the value in a `String`. JavaScript is the outlier that accepts
 *  it, and a cross-substrate authority commitment must not depend on the
 *  quirks of the language that happens to compute it first.
 *
 *  (It is NOT a same-language collision: ES2019 well-formed `JSON.stringify`
 *  escapes a lone surrogate to `\udXXX`, so the canonical text differs from the
 *  U+FFFD text. Measured before this comment was written.) */
export function unpairedSurrogateIndex(s: string): number {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return i;
      i++; // a well-formed pair; skip the low half
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return i; // a low surrogate with no high half before it
    }
  }
  return -1;
}

/** CNP-0-JCS for the ActionIntent shape, and refusing anything else.
 *
 *  Deliberately not a general encoder: this domain is a map of string keys to
 *  strings and arrays of strings, with no numbers, and a serializer that quietly
 *  handled more than its callers can produce would be untested surface in an
 *  authority path. Trinity's `conformance/cnp-0-jcs-v0/` kit is where a general
 *  implementation gets measured.
 *
 *  Member names are ordered by UTF-16 code unit (RFC 8785 §3.2.3), which is what
 *  JavaScript's default string comparison already does — written explicitly here
 *  because "correct by coincidence" is not a property anyone can check. */
function jcsString(s: string): string {
  const bad = unpairedSurrogateIndex(s);
  if (bad >= 0) {
    throw new RangeError(
      `unpaired-surrogate at index ${bad}: the value has no UTF-8 encoding and ` +
        `cannot be reproduced by a second implementation`,
    );
  }
  // ES2019 well-formed JSON.stringify implements RFC 8785 §3.2.2.2 escaping for
  // well-formed input: shortest form for \b \f \n \r \t, \u00XX for other
  // controls, literal otherwise. Verified against the rule, not assumed.
  return JSON.stringify(s);
}

function jcsValue(v: string | string[]): string {
  if (typeof v === "string") return jcsString(v);
  if (Array.isArray(v)) return `[${v.map(jcsString).join(",")}]`;
  throw new TypeError("ActionIntent members are strings or arrays of strings");
}

/** `requested_effects` is a SET: deduplicated, then ordered.
 *
 *  Sorting alone is not set semantics, and the previous code claimed it was —
 *  `["write","write"]` and `["write"]` request the same effect and produced two
 *  different commitments, so an authority grant could be made to depend on how
 *  many times a caller happened to name an effect. Duplicates are canonicalised
 *  away rather than rejected, because a repeated effect is not an error about
 *  what was asked for; it is the same ask written twice.
 *
 *  Ordering is by UTF-16 code unit, matching RFC 8785's member ordering, which
 *  is what JavaScript's default string comparison already does — written out
 *  because "correct by coincidence" is not a property anyone can check. */
function canonicalEffects(effects: string[]): string[] {
  return [...new Set(effects)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The canonical bytes' text form. Exported so a test can assert the BYTES
 *  rather than only the digest — a digest test passes for two implementations
 *  that agree on a wrong encoding, and says nothing about which bytes either
 *  produced. */
export function canonicalIntentText(intent: ActionIntent): string {
  // The SAME domain check the boundary uses. Not a repeat of part of it.
  const err = domainError(intent);
  if (err) {
    throw new RangeError(`ActionIntent is outside its domain: ${err}`);
  }
  const root: Record<string, string | string[]> = {
    args_commitment: intent.args_commitment,
    canonical_encoding: CANONICAL_ENCODING,
    input_commitments: intent.input_commitments, // ORDER PRESERVED
    numeric_profile: NUMERIC_PROFILE,
    requested_effects: canonicalEffects(intent.requested_effects),
    target_substrate: intent.target_substrate,
    verb: intent.verb,
  };
  const names = Object.keys(root).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${
    names.map((k) => `${jcsString(k)}:${jcsValue(root[k])}`).join(",")
  }}`;
}

/** The canonical bytes themselves: UTF-8, no BOM. */
export function canonicalIntentBytes(
  intent: ActionIntent,
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(canonicalIntentText(intent));
}

async function sha256Bytes(b: Uint8Array<ArrayBuffer>): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(d)).map((x) =>
    x.toString(16).padStart(2, "0")
  ).join("");
}

/** The canonical content commitment of a normalized intent. MUST stay byte-identical
 *  to Trinity x5E10's intentCommitment — the shared vector test guards it. */
export async function intentCommitment(intent: ActionIntent): Promise<string> {
  return await sha256Bytes(canonicalIntentBytes(intent));
}
