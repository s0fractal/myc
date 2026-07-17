import {
  dispatchLocalCommand,
  localCommandEffects,
  localCommandHelp,
  localCommandNames,
} from "./x01F0_local_commands.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("local command registry is complete and deterministic", () => {
  const expected = [
    "adapter-dry-run",
    "availability",
    "capture",
    "demo",
    "dry-run",
    "explain",
    "graph",
    "import",
    "index",
    "lineage",
    "publish",
    "reconcile-published",
    "reproject",
    "resolve",
    "review",
    "serve",
    "verify",
    "verify-graph",
    "verify-projections",
    "witness",
  ];
  assert(
    JSON.stringify(localCommandNames()) === JSON.stringify(expected),
    "local command registry drift",
  );
  assert(
    JSON.stringify(Object.keys(localCommandEffects()).sort()) ===
      JSON.stringify(expected),
    "local effect catalog drift",
  );
  assert(
    JSON.stringify(localCommandHelp().map(({ command }) => command)) ===
      JSON.stringify(expected),
    "local help catalog drift",
  );
});

Deno.test("unknown local commands are not claimed", async () => {
  const handled = await dispatchLocalCommand({
    command: "unknown",
    flags: {},
    rest: [],
    root: "/unused",
  });
  assert(!handled, "unknown command was claimed");
});

Deno.test("local handlers validate required arguments before effects", async () => {
  let message = "";
  try {
    await dispatchLocalCommand({
      command: "review",
      flags: {},
      rest: [],
      root: "/unused",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("review requires"), "missing argument did not fail");
});

Deno.test("local command module stays independent from CLI entrypoints", async () => {
  const source = await Deno.readTextFile(
    new URL("./x01F0_local_commands.ts", import.meta.url),
  );
  assert(!source.includes("x0100_myc"), "local handlers import the facade");
  assert(!source.includes("x01E0_cli"), "local handlers import the dispatcher");
  for (
    const domain of [
      "x0150_",
      "x0160_",
      "x0170_",
      "x0180_",
      "x0190_",
      "x01A0_",
      "x01C0_",
      "x01D0_",
    ]
  ) {
    assert(
      !source.includes(domain),
      `registry imports domain module ${domain}`,
    );
  }
});

Deno.test("capability handlers stay independent from CLI entrypoints", async () => {
  for (
    const file of [
      "x01F1_local_read_commands.ts",
      "x01F2_local_effect_commands.ts",
      "x01F3_local_serve_command.ts",
    ]
  ) {
    const source = await Deno.readTextFile(
      new URL(`./${file}`, import.meta.url),
    );
    for (
      const entrypoint of ["x0100_myc", "x01E0_cli", "x01F0_local_commands"]
    ) {
      assert(!source.includes(entrypoint), `${file} imports ${entrypoint}`);
    }
  }
});
