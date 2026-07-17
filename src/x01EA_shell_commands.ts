// Declarative subprocess command registry: script paths, permissions, effects,
// usage, aliases, argument forwarding, and post-success reindex policy.

import {
  type CommandEffect,
  type CommandHelpEntry,
  hasFlag,
} from "./x01E8_command_contract.ts";

interface ShellCommandSpec {
  script: string;
  effect: CommandEffect;
  usage: string;
  permissions: string[] | (() => string[]);
  matches?: (input: string[]) => boolean;
  forward?: "all" | "tail";
  reindex?: boolean;
}

export interface ShellCommandInvocation {
  command: string;
  script_path: string;
  args: string[];
  reindex: boolean;
}

const READ_ONLY = ["--allow-read"];
const READ_WRITE_ENV = ["--allow-read", "--allow-write", "--allow-env"];

function shell(
  effect: CommandEffect,
  script: string,
  permissions: ShellCommandSpec["permissions"],
  usage: string,
  options: Omit<
    ShellCommandSpec,
    "effect" | "script" | "permissions" | "usage"
  > = {},
): ShellCommandSpec {
  return { effect, script, permissions, usage, ...options };
}

const SHELL_COMMANDS: Record<string, ShellCommandSpec> = {
  coord: shell(
    "read",
    "./x0200_resolve.ts",
    ["--allow-read", "--allow-write", "--allow-run", "--allow-env"],
    "<coordinate> [proof flags] — resolve a graph coordinate with proof",
  ),
  organism: shell(
    "read",
    "./x8F00_organism.ts",
    READ_ONLY,
    "— show the four substrates as one body",
  ),
  membrane: shell(
    "read",
    "./x8FF0_membrane.ts",
    READ_ONLY,
    "— show body, trust, and lifecycle",
  ),
  overview: shell(
    "read",
    "./x8FF0_membrane.ts",
    READ_ONLY,
    "— alias for membrane",
  ),
  trust: shell(
    "read",
    "./x3700_trust.ts",
    READ_ONLY,
    "— project resonance over published mutations",
  ),
  resonance: shell("read", "./x3700_trust.ts", READ_ONLY, "— alias for trust"),
  standing: shell(
    "read",
    "./x2F60_temporal_envelope.ts",
    READ_ONLY,
    "[args...] — inspect temporal standing",
    { forward: "all" },
  ),
  "temporal-verify": shell(
    "read",
    "./x2FA0_temporal_verify.ts",
    ["--allow-read", "--allow-run", "--allow-env"],
    "[args...] — verify a temporal envelope",
  ),
  "temporal-sign": shell(
    "effect",
    "./x2F90_temporal_sign.ts",
    () => [
      "--allow-read",
      "--allow-env",
      `--allow-write=${
        new URL("../public/temporal", import.meta.url).pathname
      }`,
    ],
    "[args...] — create a temporal envelope",
  ),
  "ots-verify": shell(
    "read",
    "./x2F80_ots_adapter.ts",
    ["--allow-read", "--allow-run"],
    "[args...] — verify an OpenTimestamps proof",
  ),
  lifecycle: shell(
    "read",
    "./x3F00_lifecycle.ts",
    READ_ONLY,
    "— show the canonical mutation lifecycle",
  ),
  propose: shell(
    "effect",
    "./x5800_propose.ts",
    READ_WRITE_ENV,
    "--text <text> --requires <backend> [--actor <actor>]",
    { reindex: true },
  ),
  petition: shell(
    "effect",
    "./x5850_petition.ts",
    READ_WRITE_ENV,
    "[args...] — submit a signed petition",
    { reindex: true },
  ),
  "verify-deployment": shell(
    "read",
    "../sites/myc.md/verify_deployment.ts",
    ["--allow-net", "--allow-read"],
    "[url] — compare a deployment with local attested bytes",
  ),
  snapshot: shell(
    "effect",
    "../sites/myc.md/snapshot.ts",
    READ_WRITE_ENV,
    "[--write <path>] — export the public network",
  ),
  "verify-snapshot": shell(
    "effect",
    "../sites/myc.md/verify_snapshot.ts",
    ["--allow-read", "--allow-write", "--allow-net"],
    "<file|url> — verify a peer snapshot by hash",
  ),
  publish: shell(
    "effect",
    "../sites/myc.md/publish.ts",
    ["--allow-read", "--allow-run", "--allow-net", "--allow-env"],
    "--witness <voice> --content <hash> [--url <url>] — publish live",
    {
      // `publish <fqdn>` creates a local PublishDescriptor. Preserve the older
      // live-membrane spelling only when its identifying flags are present.
      matches: (input) =>
        hasFlag(input, "witness") || hasFlag(input, "content"),
    },
  ),
  "import-snapshot": shell(
    "effect",
    "../sites/myc.md/import_snapshot.ts",
    ["--allow-read", "--allow-write", "--allow-env", "--allow-net"],
    "<file|url> [--write] — verify and merge peer records",
  ),
  "resolve-proposal": shell(
    "effect",
    "./x5810_resolve_proposal.ts",
    READ_WRITE_ENV,
    "<proposal> --outcome <outcome> [evidence flags]",
    { reindex: true },
  ),
  authenticate: shell(
    "effect",
    "./x2F50_voice_auth.ts",
    READ_WRITE_ENV,
    "<descriptor> [--voice <voice>] — sign a witness",
  ),
  render: shell(
    "read",
    "./x8FE0_render.ts",
    READ_ONLY,
    "— render the membrane as HTML",
  ),
  effects: shell(
    "read",
    "./x4A10_verb_effects.ts",
    READ_ONLY,
    "— list typed capabilities for every verb",
  ),
};

export function shellCommandNames(): string[] {
  return Object.keys(SHELL_COMMANDS).sort();
}

export function shellCommandEffects(): Record<string, CommandEffect> {
  return Object.fromEntries(
    Object.entries(SHELL_COMMANDS).map((
      [command, spec],
    ) => [command, spec.effect]),
  );
}

export function shellCommandHelp(): CommandHelpEntry[] {
  return Object.entries(SHELL_COMMANDS)
    .map(([command, spec]) => ({ command, usage: spec.usage }))
    .sort((a, b) => a.command.localeCompare(b.command));
}

export function shellCommandInvocation(
  input: string[],
): ShellCommandInvocation | null {
  const command = input[0];
  const spec = command ? SHELL_COMMANDS[command] : undefined;
  if (!spec || (spec.matches && !spec.matches(input))) return null;
  const permissions = typeof spec.permissions === "function"
    ? spec.permissions()
    : spec.permissions;
  const scriptPath = new URL(spec.script, import.meta.url).pathname;
  return {
    command,
    script_path: scriptPath,
    args: [
      "run",
      ...permissions,
      scriptPath,
      ...(spec.forward === "all" ? input : input.slice(1)),
    ],
    reindex: spec.reindex === true,
  };
}
