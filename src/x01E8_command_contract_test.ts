import {
  commandEffects,
  commandHelp,
  commandNames,
  flagBoolean,
  flagString,
  hasFlag,
  parseCliArgs,
  required,
} from "./x01E8_command_contract.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertJson(actual: unknown, expected: unknown, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

Deno.test("CLI parser separates command, flags, and positional arguments", () => {
  assertJson(
    parseCliArgs([
      "capture",
      "subject",
      "--actor=codex",
      "--json",
      "--kind",
      "message",
    ]),
    {
      command: "capture",
      flags: { actor: "codex", json: true, kind: "message" },
      rest: ["subject"],
    },
    "mixed CLI arguments parsed incorrectly",
  );
  assertJson(
    parseCliArgs([]),
    { command: "help", flags: {}, rest: [] },
    "empty CLI did not select help",
  );
});

Deno.test("command projections are sorted and isolated from callers", () => {
  const commands = {
    zeta: { effect: "effect" as const, usage: "zeta usage", extra: 1 },
    alpha: { effect: "read" as const, usage: "alpha usage", extra: 2 },
  };
  const names = commandNames(commands);
  const effects = commandEffects(commands);
  const help = commandHelp(commands);

  assertJson(names, ["alpha", "zeta"], "command names are not sorted");
  assertJson(
    effects,
    { alpha: "read", zeta: "effect" },
    "command effects drift",
  );
  assertJson(
    help,
    [
      { command: "alpha", usage: "alpha usage" },
      { command: "zeta", usage: "zeta usage" },
    ],
    "command help drift",
  );

  names.push("mutated");
  effects.alpha = "serve";
  help[0].usage = "mutated";
  assertJson(
    commandNames(commands),
    ["alpha", "zeta"],
    "name projection shares caller state",
  );
  assertJson(
    commandEffects(commands),
    { alpha: "read", zeta: "effect" },
    "effect projection shares caller state",
  );
  assert(
    commandHelp(commands)[0].usage === "alpha usage",
    "help projection shares caller state",
  );
});

Deno.test("CLI parser honors the positional terminator", () => {
  const parsed = parseCliArgs([
    "import",
    "--root",
    "/tmp/myc",
    "--",
    "--literal-path",
    "tail",
  ]);
  assertJson(
    parsed.flags,
    { root: "/tmp/myc" },
    "flag before terminator drift",
  );
  assertJson(
    parsed.rest,
    ["--literal-path", "tail"],
    "arguments after terminator were treated as flags",
  );
});

Deno.test("flag accessors preserve string and boolean contracts", () => {
  const flags = {
    actor: "codex",
    enabled: true,
    disabled: "false",
    zero: "0",
  };
  assert(flagString(flags, "actor") === "codex", "string flag missing");
  assert(
    flagString(flags, "enabled") === undefined,
    "boolean leaked as string",
  );
  assert(flagBoolean(flags, "enabled", false), "boolean true lost");
  assert(!flagBoolean(flags, "disabled", true), "false string parsed true");
  assert(!flagBoolean(flags, "zero", true), "zero string parsed true");
  assert(flagBoolean(flags, "missing", true), "default boolean lost");
});

Deno.test("raw flag detection is exact and required arguments fail closed", () => {
  assert(
    hasFlag(["publish", "--witness=codex"], "witness"),
    "inline flag missed",
  );
  assert(
    !hasFlag(["publish", "--witnessed"], "witness"),
    "prefix claimed as flag",
  );
  assert(
    !hasFlag(["publish", "--", "--witness"], "witness"),
    "literal argument after terminator claimed as flag",
  );
  assert(required("value", "unused") === "value", "required value changed");
  let message = "";
  try {
    required(undefined, "target required");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(
    message === "target required",
    "required argument did not fail closed",
  );
});
