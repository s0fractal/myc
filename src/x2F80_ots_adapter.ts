#!/usr/bin/env -S deno run --allow-read --allow-run
// myc/src/x2F80_ots_adapter.ts — OpenTimestamps proof adapter (codex x2d00 P2).
// position: 2/F.8 → mirror × bridge, the external proof that a digest existed by a block.
//
// codex P2: rather than hand-roll an OTS binary verifier (easy to get subtly wrong —
// the exact overclaim P0 just corrected), this WRAPS the authoritative `ots` tool and
// reports only what it actually establishes. `parseOtsInfo` is a pure parser of
// `ots info` output (offline: it reads the EMBEDDED attestations a proof carries —
// the block heights it CLAIMS, not a verified fact). `verifyOtsProof` additionally
// runs `ots verify` for the real Bitcoin-block-header check; that needs a Bitcoin
// source, so its absence (or DNS failure) is `unavailable`, NEVER a fabricated pass.
//
// Honest verdicts: an embedded BitcoinBlockHeaderAttestation tells us the proof
// asserts block H — `ots info` does not verify the header. Only a successful
// `ots verify` yields `valid`. The bootstrap proof is a fixture proving the adapter
// reads real OTS bytes; it attests the bootstrap root and must NEVER be reused as
// proof for a different subject.

export interface OtsInfo {
  subject_digest: string | null; // the sha256 the proof timestamps
  bitcoin_block_heights: number[]; // EMBEDDED attestations — claimed, not verified
  pending_attestations: number; // calendar attestations not yet on-chain
}

/** Pure parse of `ots info` text output. Deterministic; no I/O. */
export function parseOtsInfo(text: string): OtsInfo {
  const subject =
    text.match(/File sha256 hash:\s*([0-9a-fA-F]{64})/)?.[1]?.toLowerCase() ??
      null;
  const heights: number[] = [];
  for (const m of text.matchAll(/BitcoinBlockHeaderAttestation\((\d+)\)/g)) {
    heights.push(Number(m[1]));
  }
  const pending = [...text.matchAll(/PendingAttestation\(/g)].length;
  return {
    subject_digest: subject,
    bitcoin_block_heights: heights,
    pending_attestations: pending,
  };
}

export type VerifyResult = "valid" | "invalid" | "unavailable";

export interface OtsVerdict {
  available: boolean; // is the `ots` tool usable at all?
  subject_digest: string | null;
  bitcoin_block_heights: number[];
  pending_attestations: number;
  /** the real Bitcoin-block-header verification (`ots verify`). `unavailable` when no
   *  Bitcoin source/network — codex: never a fabricated anchor. */
  verify: VerifyResult;
  verifier_version: string | null;
  reason: string;
}

async function run(
  cmd: string[],
): Promise<{ code: number; out: string; err: string } | null> {
  try {
    const p = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await p.output();
    return {
      code,
      out: new TextDecoder().decode(stdout),
      err: new TextDecoder().decode(stderr),
    };
  } catch {
    return null; // tool not installed / not runnable
  }
}

/** Read an .ots proof through the authoritative `ots` tool. Fail closed: if the tool
 *  is absent the adapter is `unavailable` (never invents an anchor); if `ots verify`
 *  cannot reach a Bitcoin source the on-chain check is `unavailable` while the
 *  embedded (claimed) attestations are still reported from `ots info`. */
export async function verifyOtsProof(
  otsPath: string,
  opts: { verify?: boolean; expectedSubject?: string; bitcoinNode?: string } =
    {},
): Promise<OtsVerdict> {
  const version = await run(["ots", "--version"]);
  if (!version) {
    return {
      available: false,
      subject_digest: null,
      bitcoin_block_heights: [],
      pending_attestations: 0,
      verify: "unavailable",
      verifier_version: null,
      reason:
        "the `ots` tool is not available — cannot read or verify the proof",
    };
  }
  const verifier_version = version.out.trim() || version.err.trim() || "ots";
  const info = await run(["ots", "info", otsPath]);
  if (!info || info.code !== 0) {
    return {
      available: true,
      subject_digest: null,
      bitcoin_block_heights: [],
      pending_attestations: 0,
      verify: "unavailable",
      verifier_version,
      reason: `ots info failed: ${info?.err?.trim() ?? "unreadable proof"}`,
    };
  }
  const parsed = parseOtsInfo(info.out);
  const expected = opts.expectedSubject?.replace(/^sha256:/, "").toLowerCase();
  if (expected && parsed.subject_digest !== expected) {
    return {
      available: true,
      subject_digest: parsed.subject_digest,
      bitcoin_block_heights: parsed.bitcoin_block_heights,
      pending_attestations: parsed.pending_attestations,
      verify: "invalid",
      verifier_version,
      reason:
        `proof subject mismatch: expected ${expected}, got ${parsed.subject_digest}`,
    };
  }

  let verify: VerifyResult = "unavailable";
  let reason =
    "embedded attestations read; on-chain header NOT verified (`ots info` only)";
  if (opts.verify) {
    // a Bitcoin source is required for the on-chain header check; pass an explicit
    // node RPC if given (the caller's infrastructure), else `ots` tries a local node.
    const verifyCmd = opts.bitcoinNode
      ? ["ots", "verify", "--bitcoin-node", opts.bitcoinNode, otsPath]
      : ["ots", "verify", otsPath];
    const v = await run(verifyCmd);
    if (!v) {
      verify = "unavailable";
      reason = "ots verify could not run";
    } else if (v.code === 0) {
      verify = "valid";
      reason = "ots verify confirmed the Bitcoin attestation";
    } else if (
      /Could not connect|cookie|network|DNS|rpcpassword|timed out/i.test(
        v.err + v.out,
      )
    ) {
      verify = "unavailable"; // no Bitcoin source — never a false fail or pass
      reason =
        "ots verify could not reach a Bitcoin source — unavailable, not invalid";
    } else {
      verify = "invalid";
      reason = `ots verify did not confirm: ${
        (v.err + v.out).trim().split("\n")[0]
      }`;
    }
  }

  return {
    available: true,
    subject_digest: parsed.subject_digest,
    bitcoin_block_heights: parsed.bitcoin_block_heights,
    pending_attestations: parsed.pending_attestations,
    verify,
    verifier_version,
    reason,
  };
}

export async function runCli(args: string[] = Deno.args): Promise<void> {
  const verify = args.includes("--verify");
  const subjectIndex = args.indexOf("--subject");
  const expectedSubject = subjectIndex >= 0
    ? args[subjectIndex + 1]
    : undefined;
  const nodeIndex = args.indexOf("--bitcoin-node");
  const bitcoinNode = nodeIndex >= 0 ? args[nodeIndex + 1] : undefined;
  const path = args[0] && !args[0].startsWith("--") ? args[0] : undefined;
  if (!path) {
    console.log(JSON.stringify(
      {
        type: "ots_adapter",
        position: "2/F8",
        usage: "ots-verify <proof.ots> [--subject sha256:<digest>] [--verify]",
        note:
          "reads embedded attestations via `ots info`; --verify runs the on-chain `ots verify` (unavailable without a Bitcoin source). Never fabricates an anchor.",
      },
      null,
      2,
    ));
    return;
  }
  const verdict = await verifyOtsProof(path, {
    verify,
    expectedSubject,
    bitcoinNode,
  });
  console.log(
    JSON.stringify(
      { type: "ots_adapter", position: "2/F8", ...verdict },
      null,
      2,
    ),
  );
  if (!verdict.available || verdict.verify === "invalid") Deno.exitCode = 1;
}

if (import.meta.main) await runCli();
