// Shared CLI command contract. Registries own behavior and permissions; this
// type keeps their coarse capability projection consistent without coupling
// local handlers to the shell dispatcher.

export type CommandEffect = "read" | "effect" | "serve";

export interface CommandHelpEntry {
  command: string;
  usage: string;
}

export type CliFlags = Record<string, string | boolean>;

export interface ParsedCliArgs {
  command: string;
  flags: CliFlags;
  rest: string[];
}

export interface LocalCommandContext {
  command: string;
  flags: CliFlags;
  rest: string[];
  root: string;
}

export type LocalCommandHandler = (
  context: LocalCommandContext,
) => void | Promise<void>;

export function parseCliArgs(args: string[]): ParsedCliArgs {
  const [command = "help", ...tail] = args;
  const flags: CliFlags = {};
  const rest: string[] = [];
  for (let index = 0; index < tail.length; index++) {
    const arg = tail[index];
    if (arg === "--") {
      rest.push(...tail.slice(index + 1));
      break;
    }
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
    if (next && next !== "--" && !next.startsWith("--")) {
      flags[trimmed] = next;
      index++;
    } else {
      flags[trimmed] = true;
    }
  }
  return { command, flags, rest };
}

export function flagString(
  flags: CliFlags,
  name: string,
): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

export function flagBoolean(
  flags: CliFlags,
  name: string,
  defaultValue: boolean,
): boolean {
  const value = flags[name];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return !["0", "false", "no"].includes(value.toLowerCase());
  }
  return defaultValue;
}

export function hasFlag(input: string[], name: string): boolean {
  const flag = `--${name}`;
  for (const arg of input.slice(1)) {
    if (arg === "--") return false;
    if (arg === flag || arg.startsWith(`${flag}=`)) return true;
  }
  return false;
}

export function required(value: string | undefined, message: string): string {
  if (!value) throw new Error(message);
  return value;
}
