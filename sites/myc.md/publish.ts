#!/usr/bin/env -S deno run --allow-read --allow-run --allow-net --allow-env
// publish.ts — witness→publish: a keyed voice publishes captured content so
// strangers resolve it on myc.md, with NO CF creds and NO maintainer deploy.
//
// A keyless person `capture`s content (local). A keyed voice then WITNESSES it —
// signs the exact batch with its voice key — and POSTs to the membrane's
// /publish. The worker verifies the witness against x2F38 and writes to a live
// KV store the resolver reads. This client PRE-VERIFIES every record with myc's
// canonical verifier, so only content that already passes verify-snapshot is
// ever published (keeping "trust the hash" green for everyone).
//
//   ./t myc publish --witness claude --content d76cf81167fc
//   ./t myc publish --witness claude --content <hash> --url https://myc.md/publish
import { dirname, join } from "jsr:@std/path@1.1.4";
import { buildSnapshot } from "./snapshot.ts";
import { verifyPath } from "../../src/x0100_myc.ts";

function flag(name: string): string | undefined {
  const i = Deno.args.indexOf("--" + name);
  return i >= 0 ? Deno.args[i + 1] : undefined;
}

async function batchDigest(
  records: Array<{ fqdn: string; rawText: string }>,
): Promise<string> {
  const canonical = JSON.stringify(
    records.map((r) => ({ fqdn: r.fqdn, rawText: r.rawText }))
      .sort((a, b) => a.fqdn < b.fqdn ? -1 : 1),
  );
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return "sha256:" +
    Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0"))
      .join("");
}

async function main() {
  const voice = flag("witness");
  const content = flag("content");
  const url = flag("url") ?? "https://myc.md/publish";
  const root = flag("root") ?? Deno.env.get("MYC_ROOT") ?? Deno.cwd();
  if (!voice) {
    throw new Error("publish needs --witness <voice> (a keyed voice)");
  }
  if (!content) {
    throw new Error(
      "publish needs --content <hash> (which captured node to publish)",
    );
  }

  const snap = await buildSnapshot(root);
  const records = snap.records.filter((r) =>
    r.fqdn.includes(content) || r.path.includes(content)
  );
  if (!records.length) {
    throw new Error(`no local records match --content ${content}`);
  }

  // PRE-VERIFY: only publish content that already passes myc's canonical verifier
  // (so a witness can never break verify-snapshot for everyone).
  for (const r of records) {
    const v = await verifyPath(join(root, r.path));
    if (!v.ok) {
      throw new Error(
        `refusing to publish unverified ${r.fqdn}: ${
          (v.errors ?? []).join("; ")
        }`,
      );
    }
  }

  // WITNESS: sign the exact batch with the voice key (custody stays in trinity).
  const digest = await batchDigest(records);
  const t = join(dirname(root), "t"); // trinity CLI (mycelium install)
  const sign = new Deno.Command(t, {
    args: ["voice-keys", "sign", `--voice=${voice}`, `--hash=${digest}`],
  });
  const out = new TextDecoder().decode((await sign.output()).stdout);
  const sig = JSON.parse(
    out.split("\n").filter((l) => l.trim().startsWith("{")).join(""),
  ).sig;
  if (!sig) throw new Error(`could not sign with voice ${voice} (no key?)`);

  // PUBLISH
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ records, witness: { voice, sig } }),
  });
  const result = await resp.json();
  console.log(JSON.stringify(
    { ...result, verified_before_publish: records.length, witness: voice },
    null,
    2,
  ));
  if (!result.ok) Deno.exitCode = 1;
}

if (import.meta.main) await main();
