// CLI orchestration and subprocess routing. Domain behavior lives in dedicated
// modules; this file only parses commands, renders output, and dispatches.

import { defaultRoot } from "./x0140_paths.ts";
import { rebuildIndex } from "./x0170_projections.ts";
import { dispatchLocalCommand } from "./x01F0_local_commands.ts";

export { renderCaptureHuman } from "./x01F0_local_commands.ts";

function parseArgs(
  args: string[],
): {
  command: string;
  flags: Record<string, string | boolean>;
  rest: string[];
} {
  const [command = "help", ...tail] = args;
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let index = 0; index < tail.length; index++) {
    const arg = tail[index];
    if (!arg.startsWith("--")) {
      rest.push(arg);
      continue;
    }
    const trimmed = arg.slice(2);
    const eq = trimmed.indexOf("=");
    if (eq >= 0) {
      flags[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
      continue;
    }
    const next = tail[index + 1];
    if (next && !next.startsWith("--")) {
      flags[trimmed] = next;
      index++;
    } else {
      flags[trimmed] = true;
    }
  }
  return { command, flags, rest };
}

function flagString(
  flags: Record<string, string | boolean>,
  name: string,
): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

interface ShellCommandSpec {
  script: string;
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

const SHELL_COMMANDS: Record<string, ShellCommandSpec> = {
  coord: {
    script: "./x0200_resolve.ts",
    permissions: [
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
    ],
  },
  organism: { script: "./x8F00_organism.ts", permissions: READ_ONLY },
  membrane: { script: "./x8FF0_membrane.ts", permissions: READ_ONLY },
  overview: { script: "./x8FF0_membrane.ts", permissions: READ_ONLY },
  trust: { script: "./x3700_trust.ts", permissions: READ_ONLY },
  resonance: { script: "./x3700_trust.ts", permissions: READ_ONLY },
  standing: {
    script: "./x2F60_temporal_envelope.ts",
    permissions: READ_ONLY,
    forward: "all",
  },
  "temporal-verify": {
    script: "./x2FA0_temporal_verify.ts",
    permissions: ["--allow-read", "--allow-run", "--allow-env"],
  },
  "temporal-sign": {
    script: "./x2F90_temporal_sign.ts",
    permissions: () => [
      "--allow-read",
      "--allow-env",
      `--allow-write=${
        new URL("../public/temporal", import.meta.url).pathname
      }`,
    ],
  },
  "ots-verify": {
    script: "./x2F80_ots_adapter.ts",
    permissions: ["--allow-read", "--allow-run"],
  },
  lifecycle: { script: "./x3F00_lifecycle.ts", permissions: READ_ONLY },
  propose: {
    script: "./x5800_propose.ts",
    permissions: READ_WRITE_ENV,
    reindex: true,
  },
  petition: {
    script: "./x5850_petition.ts",
    permissions: READ_WRITE_ENV,
    reindex: true,
  },
  "verify-deployment": {
    script: "../sites/myc.md/verify_deployment.ts",
    permissions: ["--allow-net", "--allow-read"],
  },
  snapshot: {
    script: "../sites/myc.md/snapshot.ts",
    permissions: READ_WRITE_ENV,
  },
  "verify-snapshot": {
    script: "../sites/myc.md/verify_snapshot.ts",
    permissions: ["--allow-read", "--allow-write", "--allow-net"],
  },
  publish: {
    script: "../sites/myc.md/publish.ts",
    permissions: ["--allow-read", "--allow-run", "--allow-net", "--allow-env"],
    // `publish <fqdn>` creates a local PublishDescriptor. Preserve the older
    // live-membrane spelling only when its identifying flags are present.
    matches: (input) => hasFlag(input, "witness") || hasFlag(input, "content"),
  },
  "import-snapshot": {
    script: "../sites/myc.md/import_snapshot.ts",
    permissions: [
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "--allow-net",
    ],
  },
  "resolve-proposal": {
    script: "./x5810_resolve_proposal.ts",
    permissions: READ_WRITE_ENV,
    reindex: true,
  },
  authenticate: {
    script: "./x2F50_voice_auth.ts",
    permissions: READ_WRITE_ENV,
  },
  render: { script: "./x8FE0_render.ts", permissions: READ_ONLY },
  effects: { script: "./x4A10_verb_effects.ts", permissions: READ_ONLY },
};

export function shellCommandNames(): string[] {
  return Object.keys(SHELL_COMMANDS).sort();
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

async function dispatchShellCommand(input: string[]): Promise<boolean> {
  const invocation = shellCommandInvocation(input);
  if (!invocation) return false;
  const proc = new Deno.Command("deno", {
    args: invocation.args,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await proc.output();
  if (code !== 0) Deno.exitCode = code;
  else if (invocation.reindex) await rebuildIndex(defaultRoot());
  return true;
}

export async function main(args: string[]): Promise<void> {
  if (await dispatchShellCommand(args)) return;

  const { command, flags, rest } = parseArgs(args);
  const root = flagString(flags, "root") ?? defaultRoot();
  if (await dispatchLocalCommand({ command, flags, rest, root })) return;

  console.log(helpText());
}

function helpText(): string {
  return [
    "MYC local-first descriptor CLI",
    "",
    "Commands:",
    "  capture --text <text> [--actor s0fractal] [--kind message]",
    "  capture --file <path> [--actor s0fractal] [--kind message]",
    "  resolve <fqdn>                       (descriptor FQDN → descriptor)",
    "  coord <xNNNN_handle> [--graph|--lattice|--why|--stamp <signer>|--cat]",
    "                                       (graph coordinate → git+crypto proof)",
    "  membrane                             (THE single surface — body+trust+life)",
    "  organism                             (the four substrates as one body)",
    "  trust                                (resonance over published mutations)",
    "  lifecycle                            (one vocabulary for a mutation's life)",
    "  effects                              (the typed capability of each verb)",
    "  render                               (the membrane as HTML — for human eyes)",
    "  propose --text <t> --requires <omega|liquid|trinity|spore> [--actor a]",
    "                                       (propose a DORMANT mutation; writes)",
    "  verify-deployment [url]              (verify a deployed myc.md serves only",
    "                                        local-source bytes — trust the hash)",
    "  snapshot [--write path]              (portable content-addressed export of",
    "                                        the public network — fallback/peer feed)",
    "  verify-snapshot <file|url>           (verify a peer's snapshot by hash with",
    "                                        myc's canonical verifier — trust the hash)",
    "  import-snapshot <file|url> [--write] (verify then merge a peer's new records",
    "                                        into your network; dry-run by default)",
    "  authenticate <descriptor> [--voice claude]",
    "                                       (sign a witness — integrity → authenticity)",
    "  resolve-proposal <proposal> --outcome <implemented|rejected|…>",
    "       --from-receipt <path> (derives the ref from the proof) | --evidence-ref <k:r:c>",
    "       [--actor a]   then `authenticate`  (a CLAIM; final only when authenticated)",
    "  verify <path-or-fqdn> [--with-private]",
    "  verify-graph",
    "  verify-projections",
    "  index",
    "  graph",
    "  lineage <path-or-fqdn>",
    "  explain <path-or-fqdn>",
    "  availability <path-or-fqdn>",
    "  reproject <raw-fqdn> [--actor s0fractal] [--kind message]",
    "  adapter-dry-run <adapter-name>",
    "  dry-run <recipe-fqdn>",
    "  publish <fqdn>",
    "  publish --witness <voice> --content <hash> [--url url]",
    "                                       (publish witnessed content live)",
    "  import <path>",
    "  witness <fqdn> [--actor s0fractal]",
    "  review <fqdn> <rating> [comment] [--reviewer s0fractal]",
    "  serve [--host 127.0.0.1] [--port 8787]",
    "  demo",
    "",
    "Environment:",
    "  MYC_ROOT=~/trinity/myc   (mycelium install; falls back to ~/myc standalone,",
    "                            or the repo root when run inside it)",
  ].join("\n");
}

function hasFlag(input: string[], name: string): boolean {
  const flag = `--${name}`;
  return input.slice(1).some((arg) =>
    arg === flag || arg.startsWith(`${flag}=`)
  );
}
