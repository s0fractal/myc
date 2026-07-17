#!/usr/bin/env -S deno run --allow-net
// verify_deployment.ts — Resonant Resolution, step 1: verify a deployed myc.md
// fallback serves ONLY what the local source attests. Trust the hash, not the host.
//
// It checks three things, by content hash:
//   1. digest_match                — deployed /attestation digest == local source digest
//   2. deployed_serves_what_it_attests — each fetched asset hashes to the deployed claim
//   3. deployed_matches_local_source   — each fetched asset hashes to the LOCAL source
// VERIFIED only if all three hold. The central tier becomes verified, not trusted.
//
// Usage: deno run --allow-net verify_deployment.ts [url]   (default https://myc.md)
//        ./t myc verify-deployment <url>
// (chord x6000_954726)
import { sha256Hex } from "../../src/verify_core.ts";
import { attestation, SERVED_ASSETS } from "./worker.ts";

export interface DeploymentVerdict {
  digest_match: boolean;
  deployed_serves_what_it_attests: boolean;
  deployed_matches_local_source: boolean;
  assets: Array<{
    path: string;
    local: string;
    attested: string | null;
    served: string;
    served_as_attested: boolean;
    matches_local: boolean;
  }>;
  verdict: "VERIFIED" | "MISMATCH";
}

/** Pure verdict: trust the hash, not the host. VERIFIED only when the deployed
 *  digest matches local source, the server serves what it attests, and every
 *  served asset is byte-identical to local source. */
export function evaluateDeployment(
  local: { digest: string; assets: Record<string, string> },
  claim: { digest?: string; assets?: Record<string, string> },
  served: Record<string, string>,
): DeploymentVerdict {
  const assets = Object.keys(local.assets).sort().map((path) => {
    const servedHash = served[path] ?? "unreachable";
    return {
      path,
      local: local.assets[path],
      attested: claim.assets?.[path] ?? null,
      served: servedHash,
      served_as_attested: servedHash === claim.assets?.[path],
      matches_local: servedHash === local.assets[path],
    };
  });
  const digest_match = claim.digest === local.digest;
  const deployed_serves_what_it_attests = assets.every((a) =>
    a.served_as_attested
  );
  const deployed_matches_local_source = assets.every((a) => a.matches_local);
  return {
    digest_match,
    deployed_serves_what_it_attests,
    deployed_matches_local_source,
    assets,
    verdict: digest_match && deployed_serves_what_it_attests &&
        deployed_matches_local_source
      ? "VERIFIED"
      : "MISMATCH",
  };
}

async function main() {
  const url = (Deno.args[0] ?? "https://myc.md").replace(/\/+$/, "");
  const local = await attestation();

  let claim: { digest?: string; assets?: Record<string, string> };
  try {
    const r = await fetch(url + "/attestation");
    if (!r.ok) throw new Error("HTTP " + r.status);
    claim = await r.json();
  } catch (e) {
    console.log(JSON.stringify(
      {
        type: "deployment-verification",
        url,
        verdict: "UNREACHABLE",
        error: `could not fetch ${url}/attestation: ${(e as Error).message}`,
        hint: "is the url right + the worker deployed with /attestation?",
      },
      null,
      2,
    ));
    Deno.exitCode = 2;
    return;
  }

  const served: Record<string, string> = {};
  for (const path of Object.keys(SERVED_ASSETS).sort()) {
    try {
      const r = await fetch(url + path);
      served[path] = "sha256:" + (await sha256Hex(await r.text()));
    } catch {
      served[path] = "unreachable";
    }
  }

  const v = evaluateDeployment(local, claim, served);
  console.log(JSON.stringify(
    {
      type: "deployment-verification",
      url,
      local_digest: local.digest,
      deployed_digest: claim.digest ?? null,
      ...v,
      meaning: v.verdict === "VERIFIED"
        ? "the deployed fallback serves byte-identical, auditable source"
        : "deployed bytes differ from local source — do not trust this fallback as your source",
    },
    null,
    2,
  ));
  if (v.verdict !== "VERIFIED") Deno.exitCode = 2;
}

if (import.meta.main) await main();
