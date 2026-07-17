// Declarative in-process CLI registry. Behavior is split by capability boundary
// into read, effect, and serve modules.

import {
  type CommandEffect,
  type CommandHelpEntry,
  type LocalCommandContext,
  type LocalCommandHandler,
} from "./x01E8_command_contract.ts";
import {
  adapterDryRunCommand,
  availabilityCommand,
  explainCommand,
  lineageCommand,
  recipeDryRunCommand,
  resolveCommand,
  verifyCommand,
  verifyGraphCommand,
  verifyProjectionsCommand,
} from "./x01F1_local_read_commands.ts";
import {
  captureCommand,
  demoCommand,
  graphCommand,
  importCommand,
  indexCommand,
  publishCommand,
  reconcilePublishedCommand,
  reprojectCommand,
  reviewCommand,
  witnessCommand,
} from "./x01F2_local_effect_commands.ts";
import { serveCommand } from "./x01F3_local_serve_command.ts";

export { renderCaptureHuman } from "./x01E9_cli_output.ts";
export type { LocalCommandContext } from "./x01E8_command_contract.ts";

interface LocalCommandSpec {
  effect: CommandEffect;
  handler: LocalCommandHandler;
  usage: string;
}

function local(
  effect: CommandEffect,
  handler: LocalCommandHandler,
  usage: string,
): LocalCommandSpec {
  return { effect, handler, usage };
}

const LOCAL_COMMANDS: Record<string, LocalCommandSpec> = {
  capture: local(
    "effect",
    captureCommand,
    "(--text <text>|--file <path>) [--actor <actor>] [--kind <kind>]",
  ),
  resolve: local("read", resolveCommand, "<fqdn> — resolve a descriptor"),
  verify: local("read", verifyCommand, "<path-or-fqdn> [--with-private]"),
  "verify-graph": local("read", verifyGraphCommand, "— verify graph integrity"),
  "verify-projections": local(
    "read",
    verifyProjectionsCommand,
    "— verify deterministic projections",
  ),
  index: local("effect", indexCommand, "— rebuild the descriptor index"),
  "reconcile-published": local(
    "effect",
    reconcilePublishedCommand,
    "[--source <file|url>] — fold live records into the durable graph",
  ),
  graph: local("effect", graphCommand, "— rebuild the graph projection"),
  lineage: local("read", lineageCommand, "<path-or-fqdn>"),
  explain: local("read", explainCommand, "<path-or-fqdn>"),
  reproject: local(
    "effect",
    reprojectCommand,
    "<raw-fqdn> [--actor <actor>] [--kind <kind>]",
  ),
  "adapter-dry-run": local("read", adapterDryRunCommand, "<adapter-name>"),
  "dry-run": local("read", recipeDryRunCommand, "<recipe-fqdn>"),
  publish: local(
    "effect",
    publishCommand,
    "<fqdn> [--derived-from <apply-id>] — create a PublishDescriptor",
  ),
  import: local("effect", importCommand, "<path> — import a descriptor graph"),
  witness: local(
    "effect",
    witnessCommand,
    "<publish-fqdn> [--actor <actor>]",
  ),
  review: local(
    "effect",
    reviewCommand,
    "<fqdn> <rating> [comment] [--reviewer <actor>]",
  ),
  availability: local("read", availabilityCommand, "<path-or-fqdn>"),
  serve: local(
    "serve",
    serveCommand,
    "[--host <host>] [--port <port>] — start the local resolver",
  ),
  demo: local("effect", demoCommand, "— capture a deterministic demo thought"),
};

export function localCommandNames(): string[] {
  return Object.keys(LOCAL_COMMANDS).sort();
}

export function localCommandEffects(): Record<string, CommandEffect> {
  return Object.fromEntries(
    Object.entries(LOCAL_COMMANDS).map((
      [command, spec],
    ) => [command, spec.effect]),
  );
}

export function localCommandHelp(): CommandHelpEntry[] {
  return Object.entries(LOCAL_COMMANDS)
    .map(([command, spec]) => ({ command, usage: spec.usage }))
    .sort((a, b) => a.command.localeCompare(b.command));
}

export async function dispatchLocalCommand(
  context: LocalCommandContext,
): Promise<boolean> {
  const spec = LOCAL_COMMANDS[context.command];
  if (!spec) return false;
  await spec.handler(context);
  return true;
}
