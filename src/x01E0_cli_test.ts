import * as facade from "./x0100_myc.ts";
import { type CaptureResult } from "./x01D0_capture_pipeline.ts";
import {
  main,
  renderCaptureHuman,
  shellCommandInvocation,
  shellCommandNames,
} from "./x01E0_cli.ts";
import { localCommandNames } from "./x01F0_local_commands.ts";

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

Deno.test("shell command registry is complete and permission-bounded", () => {
  const expected = [
    "authenticate",
    "coord",
    "effects",
    "import-snapshot",
    "lifecycle",
    "membrane",
    "organism",
    "ots-verify",
    "overview",
    "petition",
    "propose",
    "publish",
    "render",
    "resolve-proposal",
    "resonance",
    "snapshot",
    "standing",
    "temporal-sign",
    "temporal-verify",
    "trust",
    "verify-deployment",
    "verify-snapshot",
  ];
  assert(
    JSON.stringify(shellCommandNames()) === JSON.stringify(expected),
    "shell command registry drift",
  );

  const readOnly = [
    "effects",
    "lifecycle",
    "membrane",
    "organism",
    "overview",
    "render",
    "resonance",
    "standing",
    "trust",
  ];
  for (const command of readOnly) {
    const invocation = shellCommandInvocation([command]);
    assert(invocation, `${command} missing`);
    const scriptIndex = invocation.args.indexOf(invocation.script_path);
    assert(
      JSON.stringify(invocation.args.slice(1, scriptIndex)) ===
        JSON.stringify(["--allow-read"]),
      `${command} permission widening`,
    );
  }

  const reindexing = shellCommandNames().filter((command) =>
    shellCommandInvocation([command])?.reindex
  );
  assert(
    JSON.stringify(reindexing) ===
      JSON.stringify(["petition", "propose", "resolve-proposal"]),
    "post-success reindex drift",
  );
});

Deno.test("shell aliases and argument forwarding preserve legacy behavior", () => {
  const membrane = shellCommandInvocation(["membrane", "--json"]);
  const overview = shellCommandInvocation(["overview", "--json"]);
  const trust = shellCommandInvocation(["trust"]);
  const resonance = shellCommandInvocation(["resonance"]);
  const standing = shellCommandInvocation(["standing", "--json"]);
  assert(
    membrane && overview && trust && resonance && standing,
    "alias missing",
  );
  assert(membrane.script_path === overview.script_path, "overview alias drift");
  assert(trust.script_path === resonance.script_path, "resonance alias drift");
  assert(membrane.args.at(-1) === "--json", "tail forwarding drift");
  assert(
    standing.args.slice(-2).join(" ") === "standing --json",
    "standing full forwarding drift",
  );
});

Deno.test("publish overload routes local lifecycle and live membrane forms", async () => {
  const overlaps = shellCommandNames().filter((command) =>
    localCommandNames().includes(command)
  );
  assert(
    JSON.stringify(overlaps) === JSON.stringify(["publish"]),
    "an undeclared shell/local command collision appeared",
  );

  const live = shellCommandInvocation([
    "publish",
    "--witness",
    "claude",
    "--content=abc123",
  ]);
  assert(
    live?.script_path.endsWith("/sites/myc.md/publish.ts"),
    "live publish route missing",
  );
  assert(
    shellCommandInvocation(["publish", "h.abc.intent.myc.md"]) === null,
    "local descriptor publish was intercepted by the live route",
  );

  let message = "";
  try {
    await main(["publish"]);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(
    message.includes("publish requires a fqdn"),
    "bare publish did not reach local lifecycle validation",
  );
});
