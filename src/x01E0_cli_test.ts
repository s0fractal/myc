import * as facade from "./x0100_myc.ts";
import { type CaptureResult } from "./x01D0_capture_pipeline.ts";
import { main, renderCaptureHuman } from "./x01E0_cli.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 facade preserves CLI and human renderer bindings", () => {
  assert(facade.main === main, "main binding drift");
  assert(
    facade.renderCaptureHuman === renderCaptureHuman,
    "human renderer binding drift",
  );
});

Deno.test("CLI module stays independent from the compatibility facade", async () => {
  const source = await Deno.readTextFile(
    new URL("./x01E0_cli.ts", import.meta.url),
  );
  assert(!source.includes("x0100_myc"), "CLI imports the compatibility facade");
});

Deno.test("capture human rendering remains compact and non-JSON", () => {
  const sample: CaptureResult = {
    rawHash: "a".repeat(64),
    shortHash: "a".repeat(12),
    rawFqdn: "h.aaaaaaaaaaaa.raw.myc.md",
    intentFqdn: "h.aaaaaaaaaaaa.intent.myc.md",
    namingProofFqdn: "h.aaaaaaaaaaaa.naming.myc.md",
    artifactFqdn: "message.actor.h.aaaaaaaaaaaa.myc.md",
    artifactHash: "b".repeat(64),
    transformationFqdns: [],
    files: [],
  };
  const output = renderCaptureHuman(sample);
  assert(output.includes(sample.rawFqdn), "raw address missing");
  assert(!output.trimStart().startsWith("{"), "renderer returned JSON");
});
