import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import { propose, runCli } from "./x5800_propose.ts";
import { intentCommitment } from "./x5820_action_intent.ts";
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

// END TO END: the CNP-0-JCS adoption reaches the committed artifact, not only the
// unit that computes it. `propose --action-intent` is the doorway a caller
// actually uses, and what it WRITES is what a later `actionBoundAuthority`
// compares against — so the assertion is on the bytes on disk, not on a return
// value. RFC-0003 Part 01 §5.1, Tranche A3.
Deno.test("x5800 propose --action-intent — the committed grant is the CNP-0-JCS commitment", async () => {
  await withRoot(async (root) => {
    // --requires names the BACKEND the proposal needs; the intent's
    // target_substrate is a different field and legitimately differs from it.
    const intent = {
      verb: "apply",
      target_substrate: "myc" as const,
      args_commitment: "c1",
      input_commitments: ["a", "b"],
      requested_effects: ["receipt", "write"],
    };
    const intentPath = join(root, "intent.json");
    await Deno.writeTextFile(intentPath, JSON.stringify(intent));

    await runCli([
      "--root",
      root,
      "--proposal",
      "adopt CNP-0-JCS on the authority path",
      "--requires",
      "trinity",
      "--proposer",
      "claude",
      "--action-intent",
      intentPath,
      "--json",
    ]);

    const dir = join(root, "public", "proposals");
    const names: string[] = [];
    for await (const e of Deno.readDir(dir)) if (e.isFile) names.push(e.name);
    assertEquals(names.length, 1, `expected one proposal, got ${names}`);

    // The assertion is on the COMMITTED TEXT. A proposal is a chord on disk, and
    // what a later actionBoundAuthority compares against is what landed there —
    // not what the function returned to a caller that has since gone away.
    const written = await Deno.readTextFile(join(dir, names[0]));
    const expected =
      "ccc26b8b460fe2debf0ad069d55ec170a78b7b70861f1f54c03e401e4576c3be";
    assertStringIncludes(written, expected);
    assertEquals(await intentCommitment(intent), expected);
    // The pre-adoption value must appear nowhere in what was written.
    assert(
      !written.includes(
        "d02d75adca7e0dbbd10244c7ea1e9aeafa7b6d019a0f570bcad471a38d997552",
      ),
      "the superseded digest was written to disk",
    );
  });
});

Deno.test("x5800 propose --action-intent — an unpaired surrogate writes nothing", async () => {
  await withRoot(async (root) => {
    const intentPath = join(root, "bad.json");
    // Written as an explicit escape so the file really contains a lone surrogate.
    await Deno.writeTextFile(
      intentPath,
      '{"verb":"x\\ud834y","target_substrate":"myc","args_commitment":"c",' +
        '"input_commitments":[],"requested_effects":[]}',
    );
    const prevExit = Deno.exitCode;
    await runCli([
      "--root",
      root,
      "--proposal",
      "should not land",
      "--requires",
      "trinity",
      "--proposer",
      "claude",
      "--action-intent",
      intentPath,
      "--json",
    ]);
    assertEquals(Deno.exitCode, 1, "the CLI did not fail closed");
    Deno.exitCode = prevExit;

    const dir = join(root, "public", "proposals");
    let wrote = false;
    try {
      for await (const _ of Deno.readDir(dir)) wrote = true;
    } catch { /* the directory was never created, which is also correct */ }
    assert(!wrote, "a proposal was written despite an invalid intent");
  });
});
