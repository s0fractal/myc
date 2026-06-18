import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import { propose } from "./x5800_propose.ts";
import { resolveProposal } from "./x5810_resolve_proposal.ts";
import { lifecycle } from "./x3F00_lifecycle.ts";
import { auditRoot } from "./x6C00_protocol_audit.ts";

async function withRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await Deno.makeTempDir({ prefix: "resolve_" });
  try {
    await fn(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

Deno.test("x5810 — resolves a proposal to a terminal outcome, bound to its commitment", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "thread apply->published",
      requires: "trinity",
      proposer: "claude",
    });
    assert(p.ok);
    const r = await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence: "publish --derived-from landed",
      resolver: "claude",
    });
    assert(r.ok, r.error);
    const body = await Deno.readTextFile(r.path!);
    assertEquals(/"outcome": "implemented"/.test(body), true);
    // it binds to the proposal's commitment, not a name
    assertEquals(
      body.includes(`"proposal_commitment": "${p.commitment}"`),
      true,
    );
  });
});

Deno.test("x5810 — lifecycle shows the resolved proposal as TERMINAL, not 'proposed'", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "omega",
      proposer: "claude",
    });
    await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "implemented",
      evidence: "done",
      resolver: "claude",
    });
    const o = await lifecycle(root);
    const mut = (o.mutations as Array<Record<string, unknown>>)
      .find((m) => m.kind === "proposal")!;
    assertEquals(
      mut.state,
      "implemented",
      "resolved proposal reads its terminal outcome",
    );
  });
});

Deno.test("x5810 — rejects an unknown outcome; the resolution passes audit", async () => {
  await withRoot(async (root) => {
    const p = await propose(root, {
      proposal: "x",
      requires: "spore",
      proposer: "claude",
    });
    assert(
      !(await resolveProposal(root, {
        proposalFqdn: p.fqdn!,
        outcome: "nonsense" as never,
        evidence: "",
        resolver: "claude",
      })).ok,
    );
    await resolveProposal(root, {
      proposalFqdn: p.fqdn!,
      outcome: "rejected",
      evidence: "superseded by a better design",
      resolver: "claude",
    });
    const audit = await auditRoot(root);
    assert(
      !audit.errors.some((e) => /Resolution/i.test(e)),
      "the resolution must pass its own validation: " +
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
    assertEquals(
      applied.length,
      1,
      "two files, one intent_hash → one applied mutation",
    );
  });
});
