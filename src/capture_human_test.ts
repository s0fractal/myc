// Falsifier for the capture-doorway dogfood (2026-07-01): `t myc capture` is the
// newcomer's CONTRIBUTE path, so a person in a terminal must see a friendly summary
// — what happened + what it means — not a wall of JSON hashes. The human render must
// name the address, say it is keyless/content-addressed, and that it carries no trust
// until witnessed; and it must NOT be JSON.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type CaptureResult, renderCaptureHuman } from "./x0100_myc.ts";

const sample: CaptureResult = {
  rawHash: "b2cdcb5d03c1f38c56a63edaa76022715ec266f32ce1df3e908e81a614b4911d",
  shortHash: "b2cdcb5d03c1",
  rawFqdn: "h.b2cdcb5d03c1.message.tester.raw.myc.md",
  intentFqdn: "intent.message.tester.h.b2cdcb5d03c1.myc.md",
  namingProofFqdn: "naming-proof.tester.h.b2cdcb5d03c1.myc.md",
  artifactFqdn: "message.tester.h.b2cdcb5d03c1.myc.md",
  artifactHash: "aa".repeat(32),
  transformationFqdns: [],
};

Deno.test("renderCaptureHuman: a newcomer sees a friendly summary, not JSON", () => {
  const out = renderCaptureHuman(sample);
  assert(!out.trimStart().startsWith("{"), "must NOT be raw JSON");
  assert(out.includes(sample.rawFqdn), "must show the content address");
  assert(
    /keyless|content-address/i.test(out),
    "must say it is keyless / content-addressed",
  );
  assert(
    /witness/i.test(out),
    "must say it carries no trust until a voice witnesses it",
  );
});
