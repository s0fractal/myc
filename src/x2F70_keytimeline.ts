// myc/src/x2F70_keytimeline.ts — the pure key-timeline verifier, MYC-resident.
// position: 2/F.7 → mirror × bridge, which key was valid WHEN.
//
// codex x6d00_954417 step 4: the canonical pure timeline verifier belongs in MYC,
// because authenticity is a membrane contract and MYC must verify a supplied trust
// bundle WITHOUT reading Trinity. This is the verification subset of Trinity's
// x2B00_keytimeline — VENDORED byte-identically (Trinity CI runs without this
// submodule, so a static import is impossible). A shared known-answer vector pins
// the two `keyStateAt` implementations; if either drifts, exactly one test fails.
//
// Pure and fail-closed: it answers "which key was valid for a principal AT an
// anchor, and is it still trusted?" — never WHO may rotate or revoke (custody). A
// forked principal is suspended; no heuristic or resonance score ever picks a
// branch (the three-planes law).

export type AnchorKind = "bitcoin_block" | "wall_clock" | "none";
export interface Anchor {
  kind: AnchorKind;
  height?: number;
  iso?: string;
  inclusion_receipt?: string;
}
export type EventKind = "activate" | "delegate" | "revoke" | "rotate";
export interface KeyEvent {
  principal: string;
  event: EventKind;
  signing_key: string;
  sequence: number; // monotonic per principal, from 0
  predecessor_commitment: string | null;
  valid_from: Anchor;
  valid_until?: Anchor | null;
  compromised_since?: Anchor; // revoke: trust withdrawn for anchors ≥ this
  commitment?: string;
}

export interface KeyState {
  principal: string;
  anchor: Anchor;
  signing_key: string | null;
  valid_at_signing: boolean; // was a key active at that anchor?
  trusted_now: boolean; // …and is it still trusted (not retroactively revoked)?
  suspended: boolean; // principal forked
  reason: string;
}

/** Compare two anchors of the SAME kind; null across kinds (never silently mix). */
export function compareAnchor(a: Anchor, b: Anchor): number | null {
  if (a.kind === "bitcoin_block" && b.kind === "bitcoin_block") {
    return Math.sign((a.height ?? 0) - (b.height ?? 0));
  }
  if (a.kind === "wall_clock" && b.kind === "wall_clock") {
    return Math.sign(String(a.iso).localeCompare(String(b.iso)));
  }
  return null;
}
const lte = (a: Anchor, b: Anchor) => {
  const c = compareAnchor(a, b);
  return c !== null && c <= 0;
};

/** Principals whose chain forks — two events sharing a sequence number, or two
 *  distinct events claiming the same predecessor. A fork suspends the principal
 *  until a custody/governance ceremony resolves it; we never pick a branch. */
export function forkedPrincipals(events: KeyEvent[]): string[] {
  const forked = new Set<string>();
  const bySeq = new Map<string, Set<number>>();
  const byPred = new Map<string, Set<string>>();
  for (const e of events) {
    const seqs = bySeq.get(e.principal) ?? new Set<number>();
    if (seqs.has(e.sequence)) forked.add(e.principal);
    seqs.add(e.sequence);
    bySeq.set(e.principal, seqs);
    if (e.predecessor_commitment) {
      const preds = byPred.get(e.principal) ?? new Set<string>();
      if (preds.has(e.predecessor_commitment)) forked.add(e.principal);
      preds.add(e.predecessor_commitment);
      byPred.set(e.principal, preds);
    }
  }
  return [...forked];
}

/** Resolve which key was valid for a principal AT an anchor, separating
 *  valid_at_signing (active in its [valid_from, valid_until) window then) from
 *  trusted_now. A revoke carrying compromised_since withdraws trust for every
 *  anchor ≥ that point — revocation is EXPLICITLY, not silently, retroactive.
 *  Historical answers stay reproducible after rotation (later events never change
 *  an old anchor's verdict). Faithful vendor of Trinity x2B00.keyStateAt. */
export function keyStateAt(
  events: KeyEvent[],
  principal: string,
  at: Anchor,
  suspendedPrincipals: string[] = [],
): KeyState {
  const base: KeyState = {
    principal,
    anchor: at,
    signing_key: null,
    valid_at_signing: false,
    trusted_now: false,
    suspended: suspendedPrincipals.includes(principal),
    reason: "",
  };
  if (base.suspended) {
    return { ...base, reason: "principal forked — authority suspended" };
  }

  const evs = events.filter((e) => e.principal === principal)
    .sort((a, b) => a.sequence - b.sequence);

  let active: KeyEvent | null = null;
  for (const e of evs) {
    if (e.event !== "activate" && e.event !== "rotate") continue;
    const started = lte(e.valid_from, at);
    const ended = e.valid_until ? lte(e.valid_until, at) : false;
    if (started && !ended) active = e;
  }
  if (!active) return { ...base, reason: "no key active at that anchor" };

  const revokedRetroactively = evs.some((e) =>
    e.event === "revoke" && e.signing_key === active!.signing_key &&
    e.compromised_since !== undefined && lte(e.compromised_since, at)
  );
  const revokedForward = evs.some((e) =>
    e.event === "revoke" && e.signing_key === active!.signing_key &&
    e.compromised_since === undefined && lte(e.valid_from, at)
  );

  return {
    ...base,
    signing_key: active.signing_key,
    valid_at_signing: true,
    trusted_now: !revokedRetroactively && !revokedForward,
    reason: revokedRetroactively
      ? "key valid at signing, but trust withdrawn retroactively (compromised_since ≤ anchor)"
      : revokedForward
      ? "key valid at signing, but revoked at/after this anchor"
      : "key valid at signing and still trusted",
  };
}

/** Convenience: resolve a principal's key state at an anchor, auto-suspending forks. */
export function resolveKeyState(
  events: KeyEvent[],
  principal: string,
  at: Anchor,
): KeyState {
  return keyStateAt(events, principal, at, forkedPrincipals(events));
}
