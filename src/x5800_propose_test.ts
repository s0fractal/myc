import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import { propose } from "./x5800_propose.ts";
import { auditRoot } from "./x6C00_protocol_audit.ts";

async function withRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await Deno.makeTempDir({ prefix: "propose_" });
  try {
    await fn(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

Deno.test("x5800 propose — writes a dormant, content-addressed proposal", async () => {
  await withRoot(async (root) => {
    const r = await propose(root, {
      proposal: "thread apply→published in the lifecycle",
      requires: "trinity",
      proposer: "claude",
    });
    assert(r.ok, r.error);
    assertEquals(r.state, "dormant");
    assert(/^h\.[0-9a-f]{12}\.proposal\.myc\.md$/.test(r.fqdn!), r.fqdn);
    const body = await Deno.readTextFile(r.path!);
    assertStringIncludes(body, '"type": "ProposedMutationDescriptor"');
    assertStringIncludes(body, '"state": "dormant"');
    assertStringIncludes(body, '"requires_verification": "trinity"');
  });
});

Deno.test("x5800 propose — content-addressed: same proposal → same fqdn", async () => {
  await withRoot(async (root) => {
    const a = await propose(root, {
      proposal: "x",
      requires: "omega",
      proposer: "p",
    });
    const b = await propose(root, {
      proposal: "x",
      requires: "omega",
      proposer: "p",
    });
    assertEquals(a.fqdn, b.fqdn);
  });
});

Deno.test("x5800 propose — rejects unknown backend and empty text", async () => {
  await withRoot(async (root) => {
    assert(
      !(await propose(root, {
        proposal: "x",
        requires: "nope" as never,
        proposer: "p",
      })).ok,
    );
    assert(
      !(await propose(root, {
        proposal: "  ",
        requires: "omega",
        proposer: "p",
      })).ok,
    );
  });
});

Deno.test("x5800 propose — written proposal draws no protocol-audit error", async () => {
  await withRoot(async (root) => {
    await propose(root, {
      proposal: "real proposal",
      requires: "spore",
      proposer: "claude",
    });
    const audit = await auditRoot(root);
    // a temp root lacks the locked core functions, so audit.ok is false for
    // unrelated reasons; assert specifically that the PROPOSAL itself is clean.
    assert(
      !audit.errors.some((e) => /proposal|ProposedMutation/i.test(e)),
      "proposal must pass its own validation: " + JSON.stringify(audit.errors),
    );
  });
});

Deno.test("x5800 propose — SAFETY: the audit rejects a forged non-dormant proposal", async () => {
  await withRoot(async (root) => {
    const dir = join(root, "public", "proposals");
    await Deno.mkdir(dir, { recursive: true });
    // a forged proposal claiming it is already resonant — must be rejected.
    const forged = {
      type: "ProposedMutationDescriptor",
      schema_version: "myc.proposed-mutation.v0.1",
      fqdn: "h.forged000000.proposal.myc.md",
      commitment: {
        algorithm: "sha256",
        value: "x",
        covers: "descriptor.body",
      },
      body: {
        proposal: "trust me",
        proposer: "mallory",
        requires_verification: "trinity",
        state: "resonant", // forged
      },
    };
    const md =
      '---\nchord:\n  primary: "oct:5.action"\n---\n\n# x\n\n```json myc\n' +
      JSON.stringify(forged, null, 2) + "\n```\n";
    await Deno.writeTextFile(join(dir, forged.fqdn), md);
    const audit = await auditRoot(root);
    assertEquals(audit.ok, false);
    assert(
      audit.errors.some((e) => /state must be 'dormant'/.test(e)),
      "the audit must reject a non-dormant proposal",
    );
  });
});
