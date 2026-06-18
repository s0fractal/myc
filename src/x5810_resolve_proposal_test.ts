import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import { propose } from "./x5800_propose.ts";
import { resolveProposal } from "./x5810_resolve_proposal.ts";
import { authenticateFile, signCommitment } from "./x2F50_voice_auth.ts";
import { lifecycle } from "./x3F00_lifecycle.ts";
import { auditRoot } from "./x6C00_protocol_audit.ts";

const TRINITY_ROOT = new URL("../../", import.meta.url).pathname.replace(
  /\/$/,
  "",
);

async function withRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await Deno.makeTempDir({ prefix: "resolve_" });
  try {
    await fn(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

function ev(commitment: string) {
  return [{ kind: "commit", ref: "deadbeef", commitment }];
}

async function proposalState(root: string): Promise<string> {
  // verify against the real trinity registry so authenticated resolutions count
  const o = await lifecycle(root, TRINITY_ROOT);
  const p = (o.mutations as Array<Record<string, unknown>>)
    .find((m) => m.kind === "proposal");
  return String(p?.state);
}

Deno.test("x5810 — v0.2: structured evidence_refs, bound to the proposal commitment", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "trinity",
      proposer: "claude",
    });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: ev("c0ffee"),
      resolver: "claude",
    });
    assert(r.ok, r.error);
    const body = await Deno.readTextFile(r.path!);
    assert(body.includes('"schema_version": "myc.proposal-resolution.v0.2"'));
    assert(body.includes(`"proposal_commitment": "${p.commitment}"`));
    assert(body.includes('"evidence_refs"'));
  });
});

Deno.test("x5810 — finality: an UNauthenticated resolution is `resolution_claimed`, never final", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "trinity",
      proposer: "claude",
    });
    await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: ev("c0ffee"),
      resolver: "claude",
    });
    assertEquals(await proposalState(root), "resolution_claimed");
  });
});

Deno.test("x5810 — finality: an authenticated, evidenced resolution is FINAL (skips w/o key)", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "trinity",
      proposer: "claude",
    });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: ev("c0ffee"),
      resolver: "claude",
    });
    const a = await authenticateFile(r.path!, "claude");
    if (!a.ok) return; // no local claude key (CI) — finality unexercisable here
    assertEquals(await proposalState(root), "implemented");
  });
});

Deno.test("x5810 — finality: signer != resolver does NOT make it final (skips w/o key)", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "trinity",
      proposer: "claude",
    });
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: ev("c0ffee"),
      resolver: "gemini", // claims gemini resolved it…
    });
    const a = await authenticateFile(r.path!, "claude"); // …but claude signed
    if (!a.ok) return;
    // signer (claude) != resolver (gemini) → not authenticated → claimed
    assertEquals(await proposalState(root), "resolution_claimed");
  });
});

Deno.test("x5810 — finality: two authenticated CONFLICTING outcomes → conflicted (skips w/o key)", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "trinity",
      proposer: "claude",
    });
    // need a second voice key to truly conflict; if absent, simulate by writing a
    // second claude resolution with a different outcome — distinct resolver labels.
    const sig = await signCommitment("claude", "probe");
    if (!sig) return; // no key
    const r1 = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence_refs: ev("a"),
      resolver: "claude",
    });
    await authenticateFile(r1.path!, "claude");
    // a second resolution, different outcome, also signed by claude but labelled a
    // different resolver — to make it AUTHENTICATED we keep resolver=claude but a
    // different outcome; distinct authed outcomes from the same actor still flips
    // to conflicted because the outcome set has >1 member.
    const r2 = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "rejected",
      evidence_refs: ev("b"),
      resolver: "claude",
    });
    await authenticateFile(r2.path!, "claude");
    const st = await proposalState(root);
    assert(st === "conflicted", `expected conflicted, got ${st}`);
  });
});

Deno.test("x5810 — finality: a tampered resolution (commitment != body) is ignored", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "trinity",
      proposer: "claude",
    });
    const dir = join(root, "public", "resolutions");
    await Deno.mkdir(dir, { recursive: true });
    const desc = {
      type: "ProposalResolutionDescriptor",
      schema_version: "myc.proposal-resolution.v0.2",
      fqdn: "h.tampered.resolution.myc.md",
      commitment: {
        algorithm: "sha256",
        value: "0".repeat(64),
        covers: "descriptor.body",
      },
      body: {
        outcome: "implemented",
        proposal_commitment: p.commitment,
        resolver: "claude",
        evidence_refs: [],
      },
    };
    await Deno.writeTextFile(
      join(dir, "h.tampered.resolution.myc.md"),
      '---\nchord:\n  primary: "oct:5.action"\n---\n\n# r\n\n```json myc\n' +
        JSON.stringify(desc, null, 2) + "\n```\n",
    );
    // self-verify fails → ignored → proposal stays proposed
    assertEquals(await proposalState(root), "proposed");
  });
});

Deno.test("x5810 — rejects unknown outcome; v0.2 resolution passes its own audit", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "spore",
      proposer: "claude",
    });
    assert(
      !(await resolveProposal(root, {
        proposalFqdn: p.fqdn!,
        outcome: "nope" as never,
        evidence_refs: ev("a"),
        resolver: "claude",
      })).ok,
    );
    await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "rejected",
      evidence_refs: ev("a"),
      resolver: "claude",
    });
    const audit = await auditRoot(root);
    assert(
      !audit.errors.some((e) => /Resolution/i.test(e)),
      JSON.stringify(audit.errors),
    );
  });
});

Deno.test("x5810 — lifecycle dedups apply receipts sharing one identity", async () => {
  await withRoot(async (root) => {
    const dir = join(root, "substrates", "liquid", "receipts");
    await Deno.mkdir(dir, { recursive: true });
    const r = (n: string) =>
      `---\ntype: "SealedReceiptDescriptor"\nstatus: "ACCEPTED"\nintent_hash: "abc123"\nderived_phase: 1\n---\n\n# r${n}\n`;
    await Deno.writeTextFile(join(dir, "receipt.aa.myc.md"), r("1"));
    await Deno.writeTextFile(join(dir, "receipt.bb.myc.md"), r("2"));
    const o = await lifecycle(root);
    const applied = (o.mutations as Array<Record<string, unknown>>)
      .filter((m) => m.kind === "phase");
    assertEquals(applied.length, 1);
  });
});
