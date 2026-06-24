#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
// myc/src/x2F50_voice_auth.ts — voice authenticity for myc descriptors.
// position: 2/F → mirror(2) × frontier(F) = identity made cryptographic
// placement_policy: axis
//
// Lifts the membrane's trust from INTEGRITY (a descriptor binds its body) to
// AUTHENTICITY (a known voice attests it) — the last honest limitation the
// trust projection (x3700) carried. Architecture (acting architect, authorized
// "далі на твій розсуд", chord forthcoming): single trust-root, no drift —
//   - SIGN with the user-level private key (~/.trinity/keys/<family>.ed25519.json),
//     substrate-agnostic; never copied into the repo.
//   - VERIFY against the superproject's committed registry
//     (<trinity>/src/x2F38_voice_pubkeys.json) — public keys only — read via myc's
//     parent. Absent (myc standalone) ⇒ unverifiable ⇒ unauthenticated (honest).
// The content_sig lives in the descriptor FRONTMATTER (like chords), so the
// descriptor's body commitment stays stable — authenticating is reversible and
// does not perturb the index.

import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);
const SUPERPROJECT = dirname(MYC_ROOT);

export function voiceFamily(voice: string): string {
  return voice.split("-")[0].toLowerCase();
}

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
// ArrayBuffer-backed (not ArrayBufferLike) so it satisfies BufferSource.
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function ed25519Sign(msg: string, privPkcs8B64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    unb64(privPkcs8B64),
    "Ed25519",
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "Ed25519",
    key,
    new TextEncoder().encode(msg),
  );
  return b64(new Uint8Array(sig));
}

async function ed25519Verify(
  msg: string,
  sigB64: string,
  pubB64: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      unb64(pubB64),
      "Ed25519",
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      unb64(sigB64),
      new TextEncoder().encode(msg),
    );
  } catch {
    return false;
  }
}

/** Sign a commitment string with the voice's local private key. Returns the
 *  base64 signature, or null when no key is available (unsigned stays legal). */
export async function signCommitment(
  voice: string,
  commitment: string,
): Promise<string | null> {
  try {
    const home = Deno.env.get("HOME") ?? ".";
    const family = voiceFamily(voice);
    const stored = JSON.parse(
      await Deno.readTextFile(
        join(home, ".trinity", "keys", `${family}.ed25519.json`),
      ),
    );
    return await ed25519Sign(commitment, stored.private_key_pkcs8);
  } catch {
    return null;
  }
}

/** Look up a voice's public key in the superproject registry. */
async function pubkeyOf(
  voice: string,
  superproject = SUPERPROJECT,
): Promise<string | null> {
  try {
    const reg = JSON.parse(
      await Deno.readTextFile(
        join(superproject, "src", "x2F38_voice_pubkeys.json"),
      ),
    );
    return reg.keys?.[voiceFamily(voice)]?.pubkey ?? null;
  } catch {
    return null;
  }
}

/** Verify a commitment signature against the registry. Returns null when the
 *  registry/pubkey is unavailable (unverifiable ⇒ honestly not authenticated). */
export async function verifyCommitment(
  voice: string,
  commitment: string,
  sig: string,
  superproject = SUPERPROJECT,
): Promise<boolean | null> {
  const pub = await pubkeyOf(voice, superproject);
  if (!pub) return null;
  return await ed25519Verify(commitment, sig, pub);
}

/** Resolve the CLI arg to a descriptor file: try it as a literal path first, then
 *  as a descriptor fqdn looked up by basename under the membrane's public/ tree.
 *  Returns null if neither finds a file — so callers fail cleanly instead of
 *  crashing on a missing read. (Friction found walking the loop as a user:
 *  `resolve-proposal` tells you to run `authenticate <resolution-fqdn>`, but a
 *  fqdn is not a path → an uncaught NotFound crash. This makes it actually work.) */
async function resolveDescriptorPath(arg: string): Promise<string | null> {
  try {
    if ((await Deno.stat(arg)).isFile) return arg;
  } catch { /* not a direct path — fall through to a fqdn lookup */ }
  const base = arg.split("/").pop() ?? arg;
  const stack = [join(MYC_ROOT, "public")];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: Deno.DirEntry[];
    try {
      entries = [...Deno.readDirSync(dir)];
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory) stack.push(p);
      else if (e.isFile && e.name === base) return p;
    }
  }
  return null;
}

/** Add a frontmatter content_sig to a descriptor file, signing its body
 *  commitment with the voice's key. The body (and its commitment) are untouched.
 *  `arg` may be a path OR a descriptor fqdn (resolved under public/). */
export async function authenticateFile(
  arg: string,
  voice: string,
): Promise<{ ok: boolean; voice: string; reason?: string; path?: string }> {
  const path = await resolveDescriptorPath(arg);
  if (!path) {
    return {
      ok: false,
      voice,
      reason:
        `descriptor not found: "${arg}" — pass a path, or the fqdn of a descriptor under public/`,
    };
  }
  const text = await Deno.readTextFile(path);
  const m = text.match(/```json myc\s*\n([\s\S]*?)\n```/);
  if (!m) return { ok: false, voice, reason: "no descriptor block" };
  let commitment: string | undefined;
  try {
    commitment = JSON.parse(m[1])?.commitment?.value;
  } catch { /* fall through */ }
  if (!commitment) return { ok: false, voice, reason: "no commitment" };
  const sig = await signCommitment(voice, commitment);
  if (!sig) return { ok: false, voice, reason: "no local key for voice" };

  const fm = text.match(/^(---\r?\n[\s\S]*?\r?\n)(---)/);
  if (!fm) return { ok: false, voice, reason: "no frontmatter" };
  // strip any prior content_sig, then insert a fresh one before the closing ---.
  let head = fm[1].replace(
    /content_sig:\n(?: {2}.*\n)+/,
    "",
  );
  const block =
    `content_sig:\n  voice: ${voiceFamily(voice)}\n  alg: ed25519\n` +
    `  covers: "commitment"\n  sig: "${sig}"\n`;
  head = head + block;
  const updated = head + "---" + text.slice(fm[0].length);
  await Deno.writeTextFile(path, updated);
  return { ok: true, voice: voiceFamily(voice), path };
}

/** Parse `<path> --voice claude` or `--voice=claude` — the first non-flag,
 *  non-flag-value token is the path. */
function parseArgs(
  args: string[],
): { path?: string; flags: Record<string, string> } {
  const flags: Record<string, string> = {};
  let path: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = args[++i] ?? "true";
    } else if (!path) {
      path = a;
    }
  }
  return { path, flags };
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const { path, flags: f } = parseArgs(args);
  if (!path) {
    console.error("usage: authenticate <descriptor-path> [--voice claude]");
    Deno.exit(1);
  }
  const result = await authenticateFile(path, f.voice ?? "claude");
  console.log(JSON.stringify(
    {
      type: "voice_authentication",
      position: "2/F",
      ...result,
      note: result.ok
        ? "frontmatter content_sig added; the body commitment is unchanged. Verify via `t myc trust`."
        : undefined,
    },
    null,
    2,
  ));
  if (!result.ok) Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
