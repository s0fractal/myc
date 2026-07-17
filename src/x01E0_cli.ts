// Thin CLI orchestration: shell dispatch, argument parsing, local dispatch, help.

import { defaultRoot } from "./x0140_paths.ts";
import { rebuildIndex } from "./x0170_projections.ts";
import {
  type CommandHelpEntry,
  flagString,
  parseCliArgs,
} from "./x01E8_command_contract.ts";
import {
  shellCommandHelp,
  shellCommandInvocation,
} from "./x01EA_shell_commands.ts";
import {
  dispatchLocalCommand,
  localCommandHelp,
} from "./x01F0_local_commands.ts";

export { renderCaptureHuman } from "./x01F0_local_commands.ts";
export {
  shellCommandEffects,
  shellCommandHelp,
  shellCommandInvocation,
  shellCommandNames,
} from "./x01EA_shell_commands.ts";
export type { ShellCommandInvocation } from "./x01EA_shell_commands.ts";

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

  const { command, flags, rest } = parseCliArgs(args);
  const root = flagString(flags, "root") ?? defaultRoot();
  if (await dispatchLocalCommand({ command, flags, rest, root })) return;

  console.log(helpText());
}

export function helpText(): string {
  return [
    "MYC local-first descriptor CLI",
    "",
    ...renderCommandGroup("Local descriptor commands:", localCommandHelp()),
    "",
    ...renderCommandGroup("Subprocess tools:", shellCommandHelp()),
    "",
    "Environment:",
    "  MYC_ROOT=~/trinity/myc   (mycelium install; falls back to ~/myc standalone,",
    "                            or the repo root when run inside it)",
  ].join("\n");
}

function renderCommandGroup(
  title: string,
  entries: CommandHelpEntry[],
): string[] {
  return [
    title,
    ...entries.map(({ command, usage }) =>
      `  ${command}${usage ? ` ${usage}` : ""}`
    ),
  ];
}
