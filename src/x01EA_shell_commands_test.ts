import {
  shellCommandEffects,
  shellCommandHelp,
  shellCommandInvocation,
  shellCommandNames,
} from "./x01EA_shell_commands.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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
  assert(
    JSON.stringify(Object.keys(shellCommandEffects()).sort()) ===
      JSON.stringify(expected),
    "shell effect catalog drift",
  );
  assert(
    JSON.stringify(shellCommandHelp().map(({ command }) => command)) ===
      JSON.stringify(expected),
    "shell help catalog drift",
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

Deno.test("shell registry stays independent from CLI entrypoints", async () => {
  const source = await Deno.readTextFile(
    new URL("./x01EA_shell_commands.ts", import.meta.url),
  );
  for (const entrypoint of ["x0100_myc", "x01E0_cli", "x01F0_local_commands"]) {
    assert(
      !source.includes(entrypoint),
      `shell registry imports ${entrypoint}`,
    );
  }
});
