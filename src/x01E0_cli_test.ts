import * as facade from "./x0100_myc.ts";
import { type CaptureResult } from "./x01D0_capture_pipeline.ts";
import {
  helpText,
  main,
  renderCaptureHuman,
  shellCommandHelp,
  shellCommandInvocation,
  shellCommandNames,
} from "./x01E0_cli.ts";
import { localCommandHelp, localCommandNames } from "./x01F0_local_commands.ts";

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
  assert(!source.includes("SHELL_COMMANDS"), "CLI embeds the shell registry");
  assert(!source.includes("--allow-"), "CLI embeds subprocess permissions");
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

Deno.test("generated help covers every executable command form exactly once", () => {
  const output = helpText();
  assert(
    output.includes("Local descriptor commands:"),
    "local help group missing",
  );
  assert(output.includes("Subprocess tools:"), "shell help group missing");
  for (
    const { command, usage } of [
      ...localCommandHelp(),
      ...shellCommandHelp(),
    ]
  ) {
    const line = `  ${command} ${usage}`;
    assert(output.split(line).length === 2, `${command} help form drift`);
  }
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
