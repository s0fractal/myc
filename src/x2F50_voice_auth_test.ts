import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "jsr:@std/path@1.1.4";
import {
  authenticateFile,
  signCommitment,
  verifyCommitment,
} from "./x2F50_voice_auth.ts";

const COMMIT = "ab".repeat(32);

Deno.test("x2F50 — sign→verify roundtrip (skips when key/registry absent)", async () => {
  const sig = await signCommitment("claude", COMMIT);
  if (!sig) return; // no local voice key (e.g. CI) — mechanism unexercisable here
  const ok = await verifyCommitment("claude", COMMIT, sig);
  if (ok === null) return; // no registry (myc standalone) — unverifiable
  assertEquals(ok, true, "authentic signature must verify");
  const tampered = await verifyCommitment("claude", "00".repeat(32), sig);
  assertEquals(tampered, false, "a different commitment must NOT verify");
});

Deno.test("x2F50 — authenticateFile adds frontmatter sig, body commitment unchanged", async () => {
  const dir = await Deno.makeTempDir({ prefix: "auth_" });
  try {
    const path = join(dir, "h.x.witness.myc.md");
    const jsonBlock = JSON.stringify(
      {
        type: "WitnessDescriptor",
        fqdn: "h.x.witness.myc.md",
        commitment: {
          algorithm: "sha256",
          value: COMMIT,
          covers: "descriptor.body",
        },
        body: { target_fqdn: "t", witness_actor: "claude" },
      },
      null,
      2,
    );
    const before = `---\nchord:\n  primary: "oct:3.7"\n---\n\n# w\n\n` +
      "```json myc\n" + jsonBlock + "\n```\n";
    await Deno.writeTextFile(path, before);

    const r = await authenticateFile(path, "claude");
    const after = await Deno.readTextFile(path);
    // the descriptor json block (and thus the commitment) must be byte-identical
    assertStringIncludes(after, jsonBlock);

    if (!r.ok) {
      // no local key (CI): legal — unsigned stays unsigned
      assertEquals(r.reason, "no local key for voice");
      return;
    }
    assertStringIncludes(after, "content_sig:");
    assertStringIncludes(after, 'covers: "commitment"');
    assertEquals(r.voice, "claude");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
