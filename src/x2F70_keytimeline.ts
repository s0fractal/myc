// myc/src/x2F70_keytimeline.ts — the MYC-resident key-timeline verifier.
// position: 2/F.7 → mirror × bridge, which key was valid WHEN.
//
// codex x6d00 step 4 + x2d00 P1. This is now a CANONICAL CHAIN VERIFIER, not merely
// a state resolver: `verifyChain` recomputes every event commitment, enforces a
// genesis matching the pinned registry root, requires a contiguous +1 sequence and
// predecessor-commitment chain, verifies each step's predecessor-authorization
// signature and each rotate/delegate subject proof-of-possession, requires
// independently verified anchors, and SUSPENDS a forked principal (it detects a
// branch, never chooses one — the three-planes law). `keyStateAt` resolves a key
// window over an ALREADY-verified chain. Pure; commitments are recomputed, never
// trusted as written.
//
// It is a faithful vendor of the FULL verification core of Trinity x2B00 (Trinity CI
// runs without this submodule, so a static import is impossible). The signature
// verifier is injected — `ed25519Verifier` is the default (raw-key base64 over the
// UTF-8 commitment, matching x2F50). Minting/rotation/revocation remain custody;
// this only verifies a supplied event set.

export type AnchorKind = "bitcoin_block" | "wall_clock" | "none";
export interface Anchor {
  kind: AnchorKind;
  height?: number;
  iso?: string;
  inclusion_receipt?: string;
}
export type EventKind = "activate" | "delegate" | "revoke" | "rotate";
export interface Scope {
  action: string[];
  substrate: string[];
  object?: string;
}
export interface KeyEvent {
  principal: string;
  event: EventKind;
  signing_key: string;
  custodian: string;
  issuer: string;
  delegate_of?: string;
  scope?: Scope;
  sequence: number;
  predecessor_commitment: string | null;
  valid_from: Anchor;
  valid_until?: Anchor | null;
  compromised_since?: Anchor;
  authorization?: {
    predecessor_signature: string;
    subject_signature?: string;
  };
  commitment: string;
}

export interface KeyState {
  principal: string;
  anchor: Anchor;
  signing_key: string | null;
  valid_at_signing: boolean;
  trusted_now: boolean;
  suspended: boolean;
  reason: string;
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

/** The content commitment of an event — signatures are detached to avoid a circular
 *  commitment. Recomputed, never trusted as written. */
export async function commitmentOf(ev: KeyEvent): Promise<string> {
  const { commitment: _c, authorization: _a, ...body } = ev;
  return await sha256(stable(body as unknown as Json));
}

/** A receipt id is a reference, not proof: only an independently admitted receipt
 *  makes an anchor usable as a time root. */
export function anchorTrust(
  a: Anchor,
  verifiedReceipts: ReadonlySet<string> = new Set(),
): "verifiable" | "self_asserted" {
  if (
    a.kind === "bitcoin_block" && a.inclusion_receipt &&
    verifiedReceipts.has(a.inclusion_receipt)
  ) return "verifiable";
  return "self_asserted";
}

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

export type SignatureVerifier = (
  publicKey: string,
  commitment: string,
  signature: string,
) => boolean | Promise<boolean>;

export interface ChainVerificationOptions {
  registryRoot: Record<string, string>;
  verifySignature: SignatureVerifier;
  verifiedAnchorReceipts: ReadonlySet<string>;
}

export interface ChainVerdict {
  valid: boolean;
  principals: string[];
  suspended: string[];
  forks: Array<{ principal: string; at_sequence: number }>;
  errors: string[];
}

function unb64(s: string): BufferSource {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out as BufferSource;
}

/** Default Ed25519 verifier — raw public key (base64) over the UTF-8 commitment,
 *  matching x2F50's signing scheme. Inject a different one for fixtures. */
export const ed25519Verifier: SignatureVerifier = async (
  publicKey,
  commitment,
  signature,
) => {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      unb64(publicKey),
      "Ed25519",
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      unb64(signature),
      new TextEncoder().encode(commitment),
    );
  } catch {
    return false;
  }
};

/** Verify chain integrity per principal (faithful vendor of x2B00.verifyChain).
 *  Genesis is an `activate` at sequence 0 with a null predecessor and a signing_key
 *  matching the pinned registry root; each later event links to its predecessor's
 *  commitment with a strictly +1 sequence, carries a valid predecessor-authorization
 *  signature, and (rotate/delegate) a subject proof-of-possession; anchors must be
 *  independently verified. A forked principal is SUSPENDED, never adjudicated. */
export async function verifyChain(
  events: KeyEvent[],
  options: ChainVerificationOptions,
): Promise<ChainVerdict> {
  const errors: string[] = [];
  const forks: Array<{ principal: string; at_sequence: number }> = [];
  const suspended = new Set<string>();

  for (const ev of events) {
    if (await commitmentOf(ev) !== ev.commitment) {
      errors.push(
        `${ev.principal}#${ev.sequence}: commitment does not bind body`,
      );
    }
    for (
      const [name, anchor] of [
        ["valid_from", ev.valid_from],
        ["valid_until", ev.valid_until],
        ["compromised_since", ev.compromised_since],
      ] as const
    ) {
      if (
        anchor &&
        anchorTrust(anchor, options.verifiedAnchorReceipts) !== "verifiable"
      ) {
        errors.push(
          `${ev.principal}#${ev.sequence}: ${name} anchor is not independently verified`,
        );
      }
    }
  }

  const byPrincipal = new Map<string, KeyEvent[]>();
  for (const ev of events) {
    (byPrincipal.get(ev.principal) ??
      byPrincipal.set(ev.principal, []).get(ev.principal)!)
      .push(ev);
  }

  for (const [principal, evs] of byPrincipal) {
    const bySeq = new Map<number, KeyEvent[]>();
    for (const e of evs) {
      (bySeq.get(e.sequence) ?? bySeq.set(e.sequence, []).get(e.sequence)!)
        .push(e);
    }
    let forked = false;
    for (const [seq, group] of bySeq) {
      if (group.length > 1) {
        forks.push({ principal, at_sequence: seq });
        suspended.add(principal);
        forked = true;
      }
    }
    if (forked) continue;

    const ordered = [...evs].sort((a, b) => a.sequence - b.sequence);
    const genesis = ordered[0];
    if (genesis.sequence !== 0 || genesis.predecessor_commitment !== null) {
      errors.push(
        `${principal}: chain must begin at sequence 0 with a null predecessor`,
      );
    }
    if (genesis.event !== "activate") {
      errors.push(`${principal}: genesis event must be 'activate'`);
    }
    if (genesis.signing_key !== options.registryRoot[principal]) {
      errors.push(
        `${principal}: genesis signing_key does not match the pinned registry root`,
      );
    }
    let activeKey: string | null = genesis.signing_key;
    for (let i = 1; i < ordered.length; i++) {
      const event = ordered[i];
      if (event.sequence !== ordered[i - 1].sequence + 1) {
        errors.push(`${principal}: sequence gap at #${event.sequence}`);
      }
      if (event.predecessor_commitment !== ordered[i - 1].commitment) {
        errors.push(
          `${principal}: #${event.sequence} predecessor does not match prior commitment`,
        );
      }
      if (event.event === "activate") {
        errors.push(`${principal}#${event.sequence}: activate is genesis-only`);
      }
      const auth = event.authorization;
      if (
        !activeKey || !auth ||
        !await options.verifySignature(
          activeKey,
          event.commitment,
          auth.predecessor_signature,
        )
      ) {
        errors.push(
          `${principal}#${event.sequence}: predecessor authorization is invalid`,
        );
      }
      if (event.event === "rotate" || event.event === "delegate") {
        if (
          !auth?.subject_signature ||
          !await options.verifySignature(
            event.signing_key,
            event.commitment,
            auth.subject_signature,
          )
        ) {
          errors.push(
            `${principal}#${event.sequence}: subject proof-of-possession is invalid`,
          );
        }
      }
      if (event.event === "rotate") activeKey = event.signing_key;
      if (event.event === "revoke" && event.signing_key === activeKey) {
        activeKey = null;
      }
    }
  }

  return {
    valid: errors.length === 0 && forks.length === 0,
    principals: [...byPrincipal.keys()],
    suspended: [...suspended],
    forks,
    errors,
  };
}

/** Resolve which key was valid for a principal AT an anchor, separating
 *  valid_at_signing from trusted_now. Operates over an event set whose validity is
 *  the CALLER's responsibility (run verifyChain first); `suspendedPrincipals`
 *  carries verifyChain's fork suspensions. A revoke with compromised_since ≤ anchor
 *  withdraws trust explicitly-retroactively; rotation never changes an old verdict. */
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

/** Full pipeline: VERIFY the chain, then resolve key state only from a valid chain.
 *  An invalid or forked chain yields no valid_at_signing — fail closed. */
export async function verifyAndResolve(
  events: KeyEvent[],
  principal: string,
  at: Anchor,
  options: ChainVerificationOptions,
): Promise<{ chain: ChainVerdict; state: KeyState }> {
  const chain = await verifyChain(events, options);
  if (!chain.valid || chain.suspended.includes(principal)) {
    return {
      chain,
      state: {
        principal,
        anchor: at,
        signing_key: null,
        valid_at_signing: false,
        trusted_now: false,
        suspended: chain.suspended.includes(principal),
        reason: chain.suspended.includes(principal)
          ? "principal forked — authority suspended"
          : "chain did not verify — no key state resolved",
      },
    };
  }
  return { chain, state: keyStateAt(events, principal, at, chain.suspended) };
}

/** STRUCTURAL fork detector for the advisory (unverified) path only. */
export function forkedPrincipals(events: KeyEvent[]): string[] {
  const forked = new Set<string>();
  const bySeq = new Map<string, Set<number>>();
  for (const e of events) {
    const seqs = bySeq.get(e.principal) ?? new Set<number>();
    if (seqs.has(e.sequence)) forked.add(e.principal);
    seqs.add(e.sequence);
    bySeq.set(e.principal, seqs);
  }
  return [...forked];
}

/** Advisory resolver (NO chain verification) — for the format classifier's routing
 *  hint only. Use verifyAndResolve for a real verdict. */
export function resolveKeyState(
  events: KeyEvent[],
  principal: string,
  at: Anchor,
): KeyState {
  return keyStateAt(events, principal, at, forkedPrincipals(events));
}
