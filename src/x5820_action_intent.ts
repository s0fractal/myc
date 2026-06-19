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

/** Validate an untrusted value as an ActionIntent. Fail closed: anything missing,
 *  mistyped, or with a non-string entry is rejected with a reason. */
export function validateIntent(
  v: unknown,
): { ok: true; intent: ActionIntent } | { ok: false; error: string } {
  if (!v || typeof v !== "object") {
    return { ok: false, error: "intent must be an object" };
  }
  const o = v as Record<string, unknown>;
  if (typeof o.verb !== "string" || !o.verb.trim()) {
    return { ok: false, error: "verb must be a non-empty string" };
  }
  if (
    typeof o.target_substrate !== "string" ||
    !SUBSTRATES.includes(o.target_substrate)
  ) {
    return {
      ok: false,
      error: `target_substrate must be one of: ${SUBSTRATES.join(", ")}`,
    };
  }
  if (typeof o.args_commitment !== "string") {
    return { ok: false, error: "args_commitment must be a string" };
  }
  const arrOfStrings = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((e) => typeof e === "string");
  if (!arrOfStrings(o.input_commitments)) {
    return {
      ok: false,
      error: "input_commitments must be an array of strings",
    };
  }
  if (!arrOfStrings(o.requested_effects)) {
    return {
      ok: false,
      error: "requested_effects must be an array of strings",
    };
  }
  return {
    ok: true,
    intent: {
      verb: o.verb,
      target_substrate: o.target_substrate as ActionIntent["target_substrate"],
      args_commitment: o.args_commitment,
      input_commitments: o.input_commitments,
      requested_effects: o.requested_effects,
    },
  };
}

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

/** The canonical content commitment of a normalized intent. MUST stay byte-identical
 *  to Trinity x5E10's intentCommitment — the shared vector test guards it. */
export async function intentCommitment(intent: ActionIntent): Promise<string> {
  return await sha256(stable({
    args_commitment: intent.args_commitment,
    input_commitments: intent.input_commitments, // ORDER PRESERVED
    requested_effects: [...intent.requested_effects].sort(), // a set
    target_substrate: intent.target_substrate,
    verb: intent.verb,
  }));
}
