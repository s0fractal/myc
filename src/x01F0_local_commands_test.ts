import {
  dispatchLocalCommand,
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
});
