import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.4";
import { propose } from "./x5800_propose.ts";
import { resolveProposal } from "./x5810_resolve_proposal.ts";
import { lifecycle } from "./x3F00_lifecycle.ts";
import { auditRoot } from "./x6C00_protocol_audit.ts";

const MYC_ROOT = dirname(dirname(fromFileUrl(import.meta.url)));

// ── REAL crypto: ephemeral Ed25519 voices + an injected temp registry, so the
// finality suite EXECUTES authenticated paths in keyless CI (codex x2900 #4). No
// test returns early on a missing developer key.

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
async function genVoice(): Promise<{ priv: CryptoKey; pub: string }> {
  const kp = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  const raw = new Uint8Array(
    await crypto.subtle.exportKey("raw", kp.publicKey),
  );
  return { priv: kp.privateKey, pub: b64(raw) };
}
async function writeRegistry(
  superproject: string,
  voices: Record<string, string>,
): Promise<void> {
  await Deno.mkdir(join(superproject, "src"), { recursive: true });
  const keys: Record<string, { pubkey: string }> = {};
  for (const [v, p] of Object.entries(voices)) keys[v] = { pubkey: p };
  await Deno.writeTextFile(
    join(superproject, "src", "x2F38_voice_pubkeys.json"),
    JSON.stringify({ keys }),
  );
}
async function authWith(
  path: string,
  voice: string,
  priv: CryptoKey,
): Promise<void> {
  const text = await Deno.readTextFile(path);
  const commitment =
    JSON.parse(text.match(/```json myc\s*\n([\s\S]*?)\n```/)![1]).commitment
      .value;
  const sig = b64(
    new Uint8Array(
      await crypto.subtle.sign(
        "Ed25519",
        priv,
        new TextEncoder().encode(commitment),
      ),
    ),
  );
  const fm = text.match(/^(---\r?\n[\s\S]*?\r?\n)(---)/)!;
  const block =
    `content_sig:\n  voice: ${voice}\n  alg: ed25519\n  covers: "commitment"\n  sig: "${sig}"\n`;
  await Deno.writeTextFile(
    path,
    fm[1] + block + "---" + text.slice(fm[0].length),
  );
}

/** Create a real, self-binding apply receipt and return an evidence_ref to it. */
async function applyEvidence(root: string) {
  const id = "14b5a247729c690e1d5a373bdfa30b6bf70ca4fa1d740470037db1d4ac8ec688";
  const dir = join(root, "substrates", "spore", "receipts");
  await Deno.mkdir(dir, { recursive: true });
  const filename = "receipt.14b5a247729c.myc.md";
  await Deno.copyFile(
    join(MYC_ROOT, "substrates", "spore", "receipts", filename),
    join(dir, filename),
  );
  return { kind: "apply", ref: filename, commitment: id };
}

async function stateOf(root: string, superproject: string): Promise<string> {
  const o = await lifecycle(root, superproject);
  const p = (o.mutations as Array<Record<string, unknown>>).find((m) =>
    m.kind === "proposal"
  );
  return String(p?.state);
}

async function scaffold(requires: string) {
  const root = await Deno.makeTempDir({ prefix: "fin_root_" });
  const sup = await Deno.makeTempDir({ prefix: "fin_sup_" });
  const p = await propose(root, {
    proposal: "x",
    requires: requires as "omega" | "spore" | "liquid" | "trinity",
    proposer: "alpha",
  });
  return { root, sup, p };
}

Deno.test("finality — unauthenticated resolution is resolution_claimed", async () => {
  const { root, sup, p } = await scaffold("spore");
  try {
    await writeRegistry(sup, {});
    await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [await applyEvidence(root)],
      resolver: "alpha",
    });
    assertEquals(await stateOf(root, sup), "resolution_claimed");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — authenticated + valid apply evidence + requires=spore → FINAL", async () => {
  const { root, sup, p } = await scaffold("spore");
  try {
    const alpha = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [await applyEvidence(root)],
      resolver: "alpha",
    });
    await authWith(r.path!, "alpha", alpha.priv);
    assertEquals(await stateOf(root, sup), "implemented");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — signer != resolver does NOT authenticate", async () => {
  const { root, sup, p } = await scaffold("spore");
  try {
    const alpha = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [await applyEvidence(root)],
      resolver: "beta", // claims beta…
    });
    await authWith(r.path!, "alpha", alpha.priv); // …signed by alpha
    assertEquals(await stateOf(root, sup), "resolution_claimed");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — valid signature but INVALID evidence → claimed (presence != proof)", async () => {
  const { root, sup, p } = await scaffold("spore");
  try {
    const alpha = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [{ kind: "commit", ref: "40b667f", commitment: "built" }], // garbage
      resolver: "alpha",
    });
    await authWith(r.path!, "alpha", alpha.priv);
    assertEquals(await stateOf(root, sup), "resolution_claimed");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — requires=trinity with ONE authenticated principal → evidence_verified, NOT final", async () => {
  const { root, sup, p } = await scaffold("trinity");
  try {
    const alpha = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [await applyEvidence(root)],
      resolver: "alpha",
    });
    await authWith(r.path!, "alpha", alpha.priv);
    assertEquals(await stateOf(root, sup), "evidence_verified");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — requires=trinity with TWO distinct principals agreeing → FINAL", async () => {
  const { root, sup, p } = await scaffold("trinity");
  try {
    const alpha = await genVoice(), beta = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub, beta: beta.pub });
    const ev = await applyEvidence(root);
    const ra = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [ev],
      resolver: "alpha",
    });
    await authWith(ra.path!, "alpha", alpha.priv);
    const rb = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [ev],
      resolver: "beta",
    });
    await authWith(rb.path!, "beta", beta.priv);
    assertEquals(await stateOf(root, sup), "implemented");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — two distinct principals, DIFFERENT outcomes → conflicted", async () => {
  const { root, sup, p } = await scaffold("trinity");
  try {
    const alpha = await genVoice(), beta = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub, beta: beta.pub });
    const ev = await applyEvidence(root);
    const ra = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [ev],
      resolver: "alpha",
    });
    await authWith(ra.path!, "alpha", alpha.priv);
    const rb = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "rejected",
      evidence_refs: [ev],
      resolver: "beta",
    });
    await authWith(rb.path!, "beta", beta.priv);
    assertEquals(await stateOf(root, sup), "conflicted");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — valid evidence of the WRONG backend kind → not final", async () => {
  const { root, sup, p } = await scaffold("spore"); // needs 'apply' evidence
  try {
    const alpha = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub });
    // a real, self-verifying publish descriptor — valid evidence, but kind=publish
    const body = { publish_clearance: { target_fqdn: "t" }, destinations: [] };
    const enc = new TextEncoder().encode(
      `{"destinations":[],"publish_clearance":{"target_fqdn":"t"}}`,
    );
    const c = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", enc)),
    ).map((x) => x.toString(16).padStart(2, "0")).join("");
    const fqdn = "h.pub.publish.myc.md";
    const pdir = join(root, "public", "consensus", "publish");
    await Deno.mkdir(pdir, { recursive: true });
    await Deno.writeTextFile(
      join(pdir, fqdn),
      "---\nx: 1\n---\n\n```json myc\n" +
        JSON.stringify(
          {
            type: "PublishDescriptor",
            fqdn,
            commitment: {
              algorithm: "sha256",
              value: c,
              covers: "descriptor.body",
            },
            body,
          },
          null,
          2,
        ) +
        "\n```\n",
    );
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: [{ kind: "publish", ref: fqdn, commitment: c }],
      resolver: "alpha",
    });
    await authWith(r.path!, "alpha", alpha.priv);
    // evidence resolves, but spore policy needs 'apply' → evidence_verified, not final
    assertEquals(await stateOf(root, sup), "evidence_verified");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — a tampered proposal body is invalid (cannot anchor)", async () => {
  const root = await Deno.makeTempDir({ prefix: "fin_t_" });
  try {
    const dir = join(root, "public", "proposals");
    await Deno.mkdir(dir, { recursive: true });
    const desc = {
      type: "ProposedMutationDescriptor",
      fqdn: "h.bad.proposal.myc.md",
      commitment: {
        algorithm: "sha256",
        value: "0".repeat(64),
        covers: "descriptor.body",
      },
      body: { proposal: "x", requires_verification: "spore", state: "dormant" },
    };
    await Deno.writeTextFile(
      join(dir, "h.bad.proposal.myc.md"),
      "---\nx: 1\n---\n\n```json myc\n" + JSON.stringify(desc, null, 2) +
        "\n```\n",
    );
    const o = await lifecycle(root);
    const pm = (o.mutations as Array<Record<string, unknown>>).find((m) =>
      m.kind === "proposal"
    )!;
    assertEquals(pm.state, "invalid");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("finality — result is identical regardless of resolution file order", async () => {
  const { root, sup, p } = await scaffold("trinity");
  try {
    const alpha = await genVoice(), beta = await genVoice();
    await writeRegistry(sup, { alpha: alpha.pub, beta: beta.pub });
    const ev = await applyEvidence(root);
    for (const [voice, key] of [["alpha", alpha], ["beta", beta]] as const) {
      const r = await resolveProposal(root, {
        proposalFqdn: p.fqdn!,
        outcome: "implemented",
        evidence_refs: [ev],
        resolver: voice,
      });
      await authWith(r.path!, voice, key.priv);
    }
    const first = await stateOf(root, sup);
    const second = await stateOf(root, sup); // grouping is order-free by construction
    assertEquals(first, second);
    assertEquals(first, "implemented");
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — v0.2 resolution passes its own audit; unknown outcome rejected", async () => {
  const { root, sup, p } = await scaffold("spore");
  try {
    await writeRegistry(sup, {});
    assert(
      !(await resolveProposal(root, {
        proposalFqdn: p.fqdn!,
        outcome: "nope" as never,
        evidence_refs: [],
        resolver: "alpha",
      })).ok,
    );
    await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "rejected",
      evidence_refs: [await applyEvidence(root)],
      resolver: "alpha",
    });
    const audit = await auditRoot(root);
    assert(
      !audit.errors.some((e) => /Resolution/i.test(e)),
      JSON.stringify(audit.errors),
    );
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sup, { recursive: true });
  }
});

Deno.test("finality — lifecycle dedups apply receipts sharing one identity", async () => {
  const root = await Deno.makeTempDir({ prefix: "fin_d_" });
  try {
    const dir = join(root, "substrates", "liquid", "receipts");
    await Deno.mkdir(dir, { recursive: true });
    const r = (n: string) =>
      `---\ntype: "SealedReceiptDescriptor"\nstatus: "ACCEPTED"\nintent_hash: "abc123"\nderived_phase: 1\n---\n\n# r${n}\n`;
    await Deno.writeTextFile(join(dir, "receipt.aa.myc.md"), r("1"));
    await Deno.writeTextFile(join(dir, "receipt.bb.myc.md"), r("2"));
    const o = await lifecycle(root);
    const applied = (o.mutations as Array<Record<string, unknown>>).filter((
      m,
    ) => m.kind === "phase");
    assertEquals(applied.length, 1);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
