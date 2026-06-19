#!/usr/bin/env -S deno run --allow-read
// myc/src/x3F00_lifecycle.ts — the canonical mutation lifecycle (architect plan
// x7300_954205 T3; sequenced after T2.1 per codex review x3300_954205).
// position: 3/F → witness(3) × frontier(F) = one vocabulary for a mutation's life
// placement_policy: projection
//
// Codex asked for the canonical lifecycle state machine: "its value is not the
// number of current nodes; it is one vocabulary for proposed → witnessed →
// reviewed → germinated/dormant." This is that single source of truth.
//
// It unifies two worlds the membrane keeps separately:
//   - APPLY RECEIPTS (substrates/*/receipts/): a SPORE.v0 apply or a liquid phase
//     receipt — the mutation was computed and receipted. State: `applied`.
//   - the CONSENSUS GRAPH (public/consensus/): publish/witness/review — the
//     mutation entered the membrane and accrues trust. States from x3700 (T2.1):
//     resonant / witnessed / dormant / invalid.
//
// HONESTY: the cross-world LINK (which applied receipt became which published
// node) is NOT yet expressed in the data — apply receipts carry spore_id/
// intent_hash; publish descriptors carry target_fqdn/target_commitment, with no
// shared key. So this view classifies BOTH worlds into one vocabulary but does
// not claim an end-to-end thread it cannot prove. Threading them is the next DATA
// step (a descriptor field), not a view trick. Read-only; a bridge, not authority.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { trustTopology } from "./x3700_trust.ts";
import { verifyCommitment, voiceFamily } from "./x2F50_voice_auth.ts";
import { type EvidenceRef, verifyEvidence } from "./x2A00_evidence.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);

// ── Resolution Finality v0.2 (codex x7d00_954231 P0) ────────────────────────────
// A resolution is a CLAIM until it is final: it must self-verify, its resolver must
// be authenticated (signer == resolver), and it must carry structured evidence_refs
// that resolve. Resolutions are grouped by proposal_commitment (never overwritten);
// incompatible authenticated outcomes are `conflicted`, surfaced with claimants;
// file order never decides truth.

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function stableStringify(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  return `{${
    Object.keys(v).sort().map((k) =>
      `${JSON.stringify(k)}:${stableStringify(v[k])}`
    )
      .join(",")
  }}`;
}
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  )
    .join("");
}
function frontmatterSig(text: string): { voice: string; sig: string } | null {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const block = fm[1].match(/content_sig:\n((?: {2}.*\n?)+)/);
  if (!block) return null;
  const voice = block[1].match(/voice:\s*(\S+)/)?.[1];
  const sig = block[1].match(/sig:\s*"([^"]+)"/)?.[1];
  return voice && sig ? { voice, sig } : null;
}

interface Resolution {
  proposalCommitment: string;
  outcome: string;
  resolver: string;
  descriptorCommitment: string;
  sig: { voice: string; sig: string } | null;
  evidenceRefs: EvidenceRef[];
  selfVerified: boolean;
}

/** Read resolutions richly: self-verify each, capture its content_sig + evidence. */
async function readResolutions(root: string): Promise<Resolution[]> {
  const dir = join(root, "public", "resolutions");
  const out: Resolution[] = [];
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".myc.md")) continue;
    const text = await Deno.readTextFile(join(dir, e.name));
    const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
    if (!m) continue;
    try {
      const d = JSON.parse(m[1]);
      if (d?.type !== "ProposalResolutionDescriptor") continue;
      const b = d.body ?? {};
      const claimed = d.commitment?.value;
      const recomputed = await sha256Hex(stableStringify(b));
      out.push({
        proposalCommitment: String(b.proposal_commitment ?? ""),
        outcome: String(b.outcome ?? ""),
        resolver: String(b.resolver ?? ""),
        descriptorCommitment: String(claimed ?? ""),
        sig: frontmatterSig(text),
        evidenceRefs: Array.isArray(b.evidence_refs)
          ? (b.evidence_refs as EvidenceRef[])
          : [], // v0.1 free-text evidence carries no verifiable ref
        selfVerified: !!claimed && recomputed === claimed,
      });
    } catch { /* skip */ }
  }
  return out;
}

/** Non-custody principal-class registry (codex bootstrap x2900_954396): which
 *  CLASS (human|model|…) each voice is. Absent ⇒ empty ⇒ every class policy fails
 *  closed (no principal has a class). Separate file from the key registry. */
async function principalClasses(
  superproject: string,
): Promise<Record<string, string>> {
  try {
    const reg = JSON.parse(
      await Deno.readTextFile(
        join(superproject, "src", "x2F39_principal_classes.json"),
      ),
    );
    return (reg.classes ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}

/** The evidence kind a backend verifier policy requires (codex x2900 P0.3.2). */
const BACKEND_KIND: Record<string, string> = {
  spore: "apply",
  liquid: "phase",
  omega: "omega",
};

/** Compute the finality of one proposal: self-verified + grouped by commitment;
 *  a resolution counts only when AUTHENTICATED (signer==resolver) and its evidence
 *  RESOLVES (not merely present); then the proposal's verifier policy decides —
 *  `trinity` needs ≥2 distinct principals (one voice is not quorum); spore/liquid/
 *  omega need a valid backend receipt. proposed → resolution_claimed →
 *  evidence_verified → final, with conflicted orthogonal. (codex x2900_954260) */
async function proposalFinality(
  proposal: {
    commitment: string;
    requires: string;
    classes?: Record<string, number>;
  },
  resolutions: Resolution[],
  ctx: { root: string; superproject: string },
): Promise<{ state: string; finality: string; detail: string }> {
  const mine = resolutions.filter((r) =>
    r.selfVerified && r.proposalCommitment === proposal.commitment
  );
  if (mine.length === 0) {
    return { state: "proposed", finality: "open", detail: "no resolution" };
  }

  let anyAuthed = false;
  const badEvidence: string[] = [];
  // authenticated AND evidence-resolved resolutions
  const verified: { resolver: string; outcome: string; kinds: Set<string> }[] =
    [];
  for (const r of mine) {
    const signerMatches = r.sig &&
      voiceFamily(r.sig.voice) === voiceFamily(r.resolver);
    if (!signerMatches) continue;
    const authedOk = await verifyCommitment(
      r.sig!.voice,
      r.descriptorCommitment,
      r.sig!.sig,
      ctx.superproject,
    );
    if (!authedOk) continue;
    anyAuthed = true;
    // RESOLVE every evidence ref — presence is not proof.
    const verdicts = await Promise.all(
      r.evidenceRefs.map((e) => verifyEvidence(e, ctx)),
    );
    const validKinds = new Set(
      verdicts.filter((x) => x.valid).map((x) => x.kind),
    );
    for (const x of verdicts.filter((x) => !x.valid)) {
      badEvidence.push(`${r.resolver}:${x.kind}(${x.reason})`);
    }
    if (validKinds.size > 0) {
      verified.push({
        resolver: r.resolver,
        outcome: r.outcome,
        kinds: validKinds,
      });
    }
  }

  if (verified.length === 0) {
    const why = !anyAuthed
      ? "no authenticated resolver"
      : `evidence did not resolve [${badEvidence.join("; ")}]`;
    return { state: "resolution_claimed", finality: "claimed", detail: why };
  }

  const distinctOutcomes = new Set(verified.map((x) => x.outcome));
  if (distinctOutcomes.size > 1) {
    return {
      state: "conflicted",
      finality: "conflicted",
      detail: `conflicting evidence-verified outcomes: ${
        verified.map((x) => `${x.resolver}=${x.outcome}`).join(", ")
      }`,
    };
  }
  const outcome = [...distinctOutcomes][0];
  const principals = new Set(verified.map((x) => voiceFamily(x.resolver)));

  // backend verifier policy
  let backendOk: boolean;
  let policy: string;
  if (proposal.classes && Object.keys(proposal.classes).length > 0) {
    // TYPED CLASS POLICY (codex bootstrap): the verified principals must cover the
    // required class counts. Fail closed — a principal with no registered class
    // counts toward nothing; an unknown required class can never be satisfied.
    const classOf = await principalClasses(ctx.superproject);
    const counts: Record<string, number> = {};
    for (const p of principals) {
      const cls = classOf[p];
      if (cls) counts[cls] = (counts[cls] ?? 0) + 1;
    }
    backendOk = Object.entries(proposal.classes).every(
      ([cls, need]) => (counts[cls] ?? 0) >= need,
    );
    policy = `class quorum ${
      Object.entries(proposal.classes).map(([c, n]) =>
        `${c}:${counts[c] ?? 0}/${n}`
      )
        .join(", ")
    }`;
  } else if (proposal.requires === "trinity") {
    backendOk = principals.size >= 2; // one voice is not quorum
    policy = `trinity quorum ${principals.size}/2`;
  } else if (BACKEND_KIND[proposal.requires]) {
    const need = BACKEND_KIND[proposal.requires];
    backendOk = verified.some((x) => x.kinds.has(need));
    policy = `${proposal.requires} needs verified '${need}' evidence`;
  } else {
    backendOk = true; // no declared backend policy → evidence-verified suffices
    policy = `no backend policy (${proposal.requires || "unset"})`;
  }

  if (backendOk) {
    return {
      state: outcome,
      finality: "final",
      detail: `final: ${outcome} — ${policy} satisfied (principals: ${
        [...principals].join(", ")
      })`,
    };
  }
  return {
    state: "evidence_verified",
    finality: "evidence_verified",
    detail: `${outcome} evidence-verified but NOT final — ${policy} unmet`,
  };
}

// The canonical lifecycle. Ordered; `dormant`/`invalid` are off-path states.
export const LIFECYCLE = [
  {
    state: "proposed",
    of: "proposal",
    meaning:
      "a dormant ProposedMutationDescriptor — proposed into the membrane, unsigned, not yet applied or verified",
  },
  {
    state: "applied",
    of: "apply-receipt",
    meaning:
      "computed + receipted (SPORE apply or phase); not yet on the consensus surface",
  },
  {
    state: "published",
    of: "consensus",
    meaning: "entered the membrane as a PublishDescriptor",
  },
  {
    state: "witnessed",
    of: "consensus",
    meaning: "≥1 commitment-bound witness verified it",
  },
  {
    state: "reviewed",
    of: "consensus",
    meaning: "≥1 commitment-bound review rated it",
  },
  {
    state: "resonant",
    of: "consensus",
    meaning: "trust-positive (germinated): witnessed and/or net-approved",
  },
  {
    state: "dormant",
    of: "consensus",
    meaning: "published, integrity-valid, unwitnessed — visible, never hidden",
  },
  {
    state: "invalid",
    of: "consensus",
    meaning: "integrity failure — commitment does not bind body",
  },
  {
    state: "resolution_claimed",
    of: "resolution",
    meaning:
      "a resolution exists but its resolver is not authenticated or it lacks evidence — a claim, never truth (codex P0 finality)",
  },
  {
    state: "evidence_verified",
    of: "resolution",
    meaning:
      "authenticated + evidence RESOLVED, but the proposal's verifier policy is not yet met (e.g. trinity quorum needs ≥2 principals) — not final (codex x2900 P0.3)",
  },
  {
    state: "conflicted",
    of: "resolution",
    meaning:
      "incompatible evidence-verified outcomes for one proposal — surfaced with claimants, never silently collapsed",
  },
  {
    state: "implemented",
    of: "resolution",
    meaning:
      "FINAL: an authenticated, evidence-verified resolution that satisfies the backend policy (also: rejected | superseded | withdrawn | expired)",
  },
] as const;

interface Mutation {
  id: string;
  kind: "proposal" | "spore-apply" | "phase" | "consensus";
  state: string;
  detail: string;
  key?: string; // matchable identity: receipt id / consensus fqdn
  derived_from?: string | null; // consensus → its apply-receipt key (the thread)
}

/** Read proposals → the lifecycle head state, OR the finality-computed state when
 *  resolutions exist (proposed | resolution_claimed | conflicted | <terminal>). */
async function readProposals(
  root: string,
  resolutions: Resolution[],
  superproject: string,
): Promise<Mutation[]> {
  const dir = join(root, "public", "proposals");
  const out: Mutation[] = [];
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".myc.md")) continue;
    const text = await Deno.readTextFile(join(dir, e.name));
    const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
    if (!m) continue;
    try {
      const d = JSON.parse(m[1]);
      if (d?.type !== "ProposedMutationDescriptor") continue;
      const b = d.body ?? {};
      const claimed = String(d.commitment?.value ?? "");
      // self-verify the proposal: a tampered proposal cannot be a trust anchor.
      const recomputed = await sha256Hex(stableStringify(b));
      if (!claimed || recomputed !== claimed) {
        out.push({
          id: String(d.fqdn ?? e.name).slice(0, 26),
          kind: "proposal",
          state: "invalid",
          detail: "proposal commitment does not bind its body (tampered)",
        });
        continue;
      }
      const f = await proposalFinality(
        {
          commitment: claimed,
          requires: String(b.requires_verification ?? ""),
          classes: (b.finality_policy as { classes?: Record<string, number> })
            ?.classes,
        },
        resolutions,
        { root, superproject },
      );
      out.push({
        id: String(d.fqdn ?? e.name).slice(0, 26),
        kind: "proposal",
        state: f.state,
        detail: f.finality === "open"
          ? `requires=${b.requires_verification ?? "?"} proposer=${
            b.proposer ?? "?"
          }`
          : `requires=${b.requires_verification ?? "?"} · ${f.detail}`,
      });
    } catch { /* skip malformed */ }
  }
  return out;
}

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*"?([^"\n]*?)"?\s*$/i);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

async function readReceipts(
  root: string,
  relDir: string,
  kind: "spore-apply" | "phase",
): Promise<Mutation[]> {
  const dir = join(root, relDir);
  const out: Mutation[] = [];
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".myc.md")) continue;
    const fm = frontmatter(await Deno.readTextFile(join(dir, e.name)));
    const key = fm.spore_id ?? fm.intent_hash ?? e.name; // full id for matching
    const detail = kind === "spore-apply"
      ? `status=${fm.status ?? "?"} fuel=${fm.total_fuel ?? "?"} (${
        fm.fuel_model ?? "spore.fuel.v1"
      })`
      : `status=${fm.status ?? "?"} phase=${fm.derived_phase ?? "?"}`;
    out.push({ id: key.slice(0, 16), kind, state: "applied", detail, key });
  }
  return out;
}

export async function lifecycle(
  root: string = MYC_ROOT,
  superprojectOverride?: string,
): Promise<Record<string, unknown>> {
  const superproject = superprojectOverride ?? dirname(root);
  const resolutions = await readResolutions(root);
  const proposed = await readProposals(root, resolutions, superproject);
  const appliedRaw = [
    ...await readReceipts(root, "substrates/spore/receipts", "spore-apply"),
    ...await readReceipts(root, "substrates/liquid/receipts", "phase"),
  ];
  // dedup apply receipts by identity (codex x6300_954228): two receipt files
  // for one intent_hash/spore_id are the same applied mutation, shown once.
  const seen = new Set<string>();
  const applied = appliedRaw.filter((m) => {
    const k = m.key ?? m.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const trust = await trustTopology(join(root, "public"), superproject);
  const nodes = (trust.nodes ?? []) as Array<Record<string, unknown>>;
  const consensus: Mutation[] = nodes.map((n) => ({
    id: String(n.target_fqdn).slice(0, 24),
    kind: "consensus",
    state: String(n.state),
    detail: `resonance=${n.resonance} witnesses=[${
      (n.valid_witnesses as string[]).join(",")
    }]`,
    key: String(n.target_fqdn),
    derived_from: (n.derived_from as string | null) ?? null,
  }));

  // Thread apply→published (x5800 proposal h.9068b4888a6f): a consensus node's
  // derived_from matches an apply-receipt's key. Match on prefix so a 16/12-char
  // id and the full hash thread the same.
  const threads: { applied: string; published: string }[] = [];
  for (const c of consensus) {
    if (!c.derived_from) continue;
    const a = applied.find((r) =>
      r.key === c.derived_from ||
      (r.key && c.derived_from!.startsWith(r.key)) ||
      r.key?.startsWith(c.derived_from!)
    );
    if (a) {
      threads.push({ applied: a.id, published: c.id });
      a.detail += ` → published ${c.id}`;
      c.detail += ` ← from ${a.id}`;
    }
  }

  // Semantic Humus (antigravity x3300_954402): a TERMINAL mutation is archived
  // FROM active attention — never deleted (it stays in `mutations`, fully
  // preserved), but flagged so reconcile/daemon/models can focus the live
  // horizon. Void = archive, not delete (the mandate's invariant).
  const ARCHIVED = new Set([
    "implemented",
    "rejected",
    "superseded",
    "withdrawn",
    "expired",
    "invalid",
  ]);
  const rawMutations = [...proposed, ...applied, ...consensus];
  const mutations = rawMutations.map((m) => ({
    ...m,
    active: !ARCHIVED.has(m.state),
  }));
  const counts: Record<string, number> = {};
  for (const m of mutations) counts[m.state] = (counts[m.state] ?? 0) + 1;
  const active_count = mutations.filter((m) => m.active).length;
  const archived_count = mutations.length - active_count;

  return {
    type: "lifecycle",
    position: "3/F",
    active_count,
    archived_count,
    note: threads.length > 0
      ? "one vocabulary for a mutation's life (T3 + thread). apply→published is now threaded where PublishDescriptor.derived_from binds a consensus node to its apply receipt."
      : "one vocabulary for a mutation's life (T3). apply→published threads when a PublishDescriptor carries derived_from (publish --derived-from <apply-id>); none in the current data yet.",
    vocabulary: LIFECYCLE,
    counts,
    threads,
    mutations,
  };
}

function renderHuman(o: Record<string, unknown>): void {
  console.log("🌱 mutation lifecycle — one vocabulary across the membrane\n");
  console.log(
    "   states: proposed → applied → published → witnessed → reviewed → resonant",
  );
  console.log(
    "           (off-path: dormant = unwitnessed · invalid = unbound)\n",
  );
  const counts = o.counts as Record<string, number>;
  console.log(
    "   " +
      Object.entries(counts).map(([s, n]) => `${s}:${n}`).join("  ") + "\n",
  );
  for (const m of o.mutations as Mutation[]) {
    const icon = m.kind === "consensus"
      ? "◆"
      : m.kind === "proposal"
      ? "✎"
      : "⟿";
    console.log(
      `   ${icon} ${m.state.padEnd(10)} ${m.id.padEnd(26)} ${m.detail}`,
    );
  }
  console.log(
    "\n   ✎ proposal (dormant)   ⟿ apply-receipt (SPORE/phase)   ◆ consensus node",
  );
  const threads = (o.threads as Array<unknown>) ?? [];
  if (threads.length > 0) {
    console.log(`   ⛓ ${threads.length} apply→published thread(s) bound.`);
  } else {
    console.log(
      "   note: apply→published threads when a publish carries --derived-from.",
    );
  }
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const o = await lifecycle();
  // --active focuses the live horizon: terminal (archived) mutations drop from
  // the view but stay in the full ledger (Void = archive from attention, not delete).
  if (args.includes("--active")) {
    const all = o.mutations as Array<{ active?: boolean }>;
    o.mutations = all.filter((m) => m.active);
  }
  if (!args.includes("--json") && Deno.stdout.isTerminal()) renderHuman(o);
  else console.log(JSON.stringify(o, null, 2));
}

if (import.meta.main) await runCli();
