// Read-only in-process CLI handlers.

import { resolveFqdn, verifyPath } from "./x0150_descriptor_index.ts";
import { verifyGraph } from "./x0160_graph.ts";
import { verifyProjections } from "./x0170_projections.ts";
import { explainTarget, lineageFor } from "./x0180_lineage.ts";
import {
  adapterDryRun,
  explainAvailability,
  recipeDryRun,
} from "./x01A0_policy_services.ts";
import { verifyRawPayload } from "./x01D0_capture_pipeline.ts";
import {
  flagBoolean,
  type LocalCommandContext,
  required,
} from "./x01E8_command_contract.ts";
import { printFailure, printJson, printOutcome } from "./x01E9_cli_output.ts";

export async function resolveCommand({ root, rest }: LocalCommandContext) {
  const fqdn = required(rest[0], "resolve requires an FQDN");
  const record = await resolveFqdn(root, fqdn);
  if (!record) return printFailure({ ok: false, error: "not-found", fqdn });
  printJson({ ok: true, ...record });
}

export async function verifyCommand(
  { root, rest, flags }: LocalCommandContext,
) {
  const target = required(rest[0], "verify requires a path or FQDN");
  const path = target.startsWith("/")
    ? target
    : (await resolveFqdn(root, target))?.path;
  if (!path) return printFailure({ ok: false, error: "not-found", target });
  const result = await verifyPath(path);
  const payload = flagBoolean(flags, "with-private", false)
    ? await verifyRawPayload(root, result.descriptor)
    : { ok: true, errors: [] };
  const ok = result.ok && payload.ok;
  printJson({
    ok,
    path,
    fqdn: result.descriptor.fqdn,
    errors: [...result.errors, ...payload.errors],
  });
  if (!ok) Deno.exitCode = 1;
}

export async function verifyGraphCommand({ root }: LocalCommandContext) {
  printOutcome(await verifyGraph(root));
}

export async function verifyProjectionsCommand({ root }: LocalCommandContext) {
  printOutcome(await verifyProjections(root));
}

export async function lineageCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "lineage requires a path or FQDN");
  printOutcome(await lineageFor(root, target));
}

export async function explainCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "explain requires a path or FQDN");
  const result = await explainTarget(root, target);
  printJson(result);
  if (result.ok === false) Deno.exitCode = 1;
}

export async function adapterDryRunCommand(
  { root, rest }: LocalCommandContext,
) {
  const adapter = required(rest[0], "adapter-dry-run requires an adapter name");
  printOutcome(await adapterDryRun(root, adapter));
}

export async function recipeDryRunCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "dry-run requires a recipe fqdn");
  printOutcome(await recipeDryRun(root, target));
}

export async function availabilityCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "availability requires a path or FQDN");
  printOutcome(await explainAvailability(root, target));
}
