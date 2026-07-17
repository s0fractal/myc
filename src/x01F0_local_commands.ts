// Typed in-process CLI commands. Each verb maps to one explicit handler;
// subprocess-backed commands remain in x01E0's permission registry.

import { resolveFqdn, verifyPath } from "./x0150_descriptor_index.ts";
import { rebuildGraph, verifyGraph } from "./x0160_graph.ts";
import { rebuildIndex, verifyProjections } from "./x0170_projections.ts";
import { explainTarget, lineageFor } from "./x0180_lineage.ts";
import {
  auditEntry,
  formatAuditEntry,
  handleResolverRequest,
} from "./x0190_http.ts";
import {
  adapterDryRun,
  explainAvailability,
  recipeDryRun,
  verificationReceipts,
} from "./x01A0_policy_services.ts";
import {
  importGraph,
  publishTarget,
  reviewTarget,
  witnessTarget,
} from "./x01C0_mutation_lifecycle.ts";
import {
  type CaptureResult,
  captureText,
  reconcilePublished,
  reprojectRaw,
  verifyRawPayload,
} from "./x01D0_capture_pipeline.ts";

export type CliFlags = Record<string, string | boolean>;

export interface LocalCommandContext {
  command: string;
  flags: CliFlags;
  rest: string[];
  root: string;
}

type LocalCommandHandler = (
  context: LocalCommandContext,
) => void | Promise<void>;

const LOCAL_COMMANDS: Record<string, LocalCommandHandler> = {
  capture: captureCommand,
  resolve: resolveCommand,
  verify: verifyCommand,
  "verify-graph": verifyGraphCommand,
  "verify-projections": verifyProjectionsCommand,
  index: indexCommand,
  "reconcile-published": reconcilePublishedCommand,
  graph: graphCommand,
  lineage: lineageCommand,
  explain: explainCommand,
  reproject: reprojectCommand,
  "adapter-dry-run": adapterDryRunCommand,
  "dry-run": recipeDryRunCommand,
  publish: publishCommand,
  import: importCommand,
  witness: witnessCommand,
  review: reviewCommand,
  availability: availabilityCommand,
  serve: serveCommand,
  demo: demoCommand,
};

export function localCommandNames(): string[] {
  return Object.keys(LOCAL_COMMANDS).sort();
}

export async function dispatchLocalCommand(
  context: LocalCommandContext,
): Promise<boolean> {
  const handler = LOCAL_COMMANDS[context.command];
  if (!handler) return false;
  await handler(context);
  return true;
}

export function renderCaptureHuman(result: CaptureResult): string {
  return [
    "✓ your thought is in the network — keyless and content-addressed.",
    "",
    `  address:  ${result.rawFqdn}`,
    `  content:  ${result.artifactFqdn}`,
    `  hash:     ${result.rawHash}`,
    "",
    "  Its identity IS its hash — anyone can verify it by that hash. It carries NO",
    "  trust yet: a voice must witness it to give it standing (open contribution,",
    "  earned trust). Run again with --json for the full descriptor + transform set.",
  ].join("\n");
}

async function captureCommand({ root, flags }: LocalCommandContext) {
  const result = await captureText({
    root,
    text: flagString(flags, "text"),
    file: flagString(flags, "file"),
    actor: flagString(flags, "actor") ?? "s0fractal",
    kind: flagString(flags, "kind") ?? "message",
    visibility: flagString(flags, "visibility"),
    storePayload: flagBoolean(flags, "store-payload", true),
    dryRun: flagBoolean(flags, "dry-run", false),
  });
  const wantJson = flagBoolean(flags, "json", false) ||
    !Deno.stdout.isTerminal();
  console.log(
    wantJson ? JSON.stringify(result, null, 2) : renderCaptureHuman(result),
  );
}

async function resolveCommand({ root, rest }: LocalCommandContext) {
  const fqdn = required(rest[0], "resolve requires an FQDN");
  const record = await resolveFqdn(root, fqdn);
  if (!record) return printFailure({ ok: false, error: "not-found", fqdn });
  printJson({ ok: true, ...record });
}

async function verifyCommand({ root, rest, flags }: LocalCommandContext) {
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

async function verifyGraphCommand({ root }: LocalCommandContext) {
  printOutcome(await verifyGraph(root));
}

async function verifyProjectionsCommand({ root }: LocalCommandContext) {
  printOutcome(await verifyProjections(root));
}

async function indexCommand({ root }: LocalCommandContext) {
  printJson({ ok: true, path: await rebuildIndex(root) });
}

async function reconcilePublishedCommand({ root, flags }: LocalCommandContext) {
  const source = flagString(flags, "source") ?? "https://myc.md/published";
  const text = source.startsWith("http")
    ? await (await fetch(source)).text()
    : await Deno.readTextFile(source);
  const records = JSON.parse(text);
  if (!Array.isArray(records)) {
    throw new Error(
      "reconcile-published: source must be a JSON array of published records",
    );
  }
  const result = await reconcilePublished(root, records);
  printJson({
    ok: result.rejected.length === 0,
    source,
    ...result,
    next: result.reconciled.length > 0
      ? "content is now in public/ (durable); run `deno task snapshot:publish` + commit to serve it from the baked snapshot"
      : "nothing new to reconcile",
  });
  if (result.rejected.length > 0) Deno.exitCode = 1;
}

async function graphCommand({ root }: LocalCommandContext) {
  printJson({ ok: true, path: await rebuildGraph(root) });
}

async function lineageCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "lineage requires a path or FQDN");
  printOutcome(await lineageFor(root, target));
}

async function explainCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "explain requires a path or FQDN");
  const result = await explainTarget(root, target);
  printJson(result);
  if (result.ok === false) Deno.exitCode = 1;
}

async function reprojectCommand({ root, rest, flags }: LocalCommandContext) {
  const target = required(rest[0], "reproject requires a RawDescriptor FQDN");
  printJson(
    await reprojectRaw(root, target, {
      actor: flagString(flags, "actor"),
      kind: flagString(flags, "kind"),
    }),
  );
}

async function adapterDryRunCommand({ root, rest }: LocalCommandContext) {
  const adapter = required(rest[0], "adapter-dry-run requires an adapter name");
  printOutcome(await adapterDryRun(root, adapter));
}

async function recipeDryRunCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "dry-run requires a recipe fqdn");
  printOutcome(await recipeDryRun(root, target));
}

async function publishCommand({ root, rest, flags }: LocalCommandContext) {
  const target = required(rest[0], "publish requires a fqdn");
  printOutcome(
    await publishTarget(root, target, flagString(flags, "derived-from")),
  );
}

async function importCommand({ root, rest }: LocalCommandContext) {
  const path = required(rest[0], "import requires a file path");
  printOutcome(await importGraph(root, path));
}

async function witnessCommand({ root, rest, flags }: LocalCommandContext) {
  const target = required(
    rest[0],
    "witness requires a target PublishDescriptor fqdn",
  );
  printOutcome(
    await witnessTarget(
      root,
      target,
      flagString(flags, "actor") ?? "s0fractal",
    ),
  );
}

async function reviewCommand({ root, rest, flags }: LocalCommandContext) {
  const target = rest[0];
  const rating = rest[1];
  if (!target || !rating) {
    throw new Error(
      "review requires a target fqdn and a rating (approve|reject|neutral)",
    );
  }
  printOutcome(
    await reviewTarget(
      root,
      target,
      flagString(flags, "reviewer") ?? "s0fractal",
      rating,
      rest[2],
    ),
  );
}

async function availabilityCommand({ root, rest }: LocalCommandContext) {
  const target = required(rest[0], "availability requires a path or FQDN");
  printOutcome(await explainAvailability(root, target));
}

function serveCommand({ root, flags }: LocalCommandContext) {
  const port = Number(flagString(flags, "port") ?? "8787");
  const hostname = flagString(flags, "host") ?? "127.0.0.1";
  printJson({ ok: true, root, hostname, port });
  Deno.serve({ hostname, port }, async (request) => {
    const start = performance.now();
    const response = await handleResolverRequest(root, request, {
      verifyRawPayload,
      verificationReceipts,
      explainAvailability,
      adapterDryRun,
      recipeDryRun,
    });
    console.log(formatAuditEntry(
      auditEntry(request, response, performance.now() - start),
    ));
    return response;
  });
}

async function demoCommand({ root }: LocalCommandContext) {
  printJson(
    await captureText({
      root,
      text:
        "зроби маленький deterministic myc demo: raw -> descriptor -> naming proof -> artifact",
      actor: "s0fractal",
      kind: "message",
      storePayload: true,
    }),
  );
}

function flagString(flags: CliFlags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function flagBoolean(
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

function required(value: string | undefined, message: string): string {
  if (!value) throw new Error(message);
  return value;
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printFailure(value: unknown): void {
  printJson(value);
  Deno.exitCode = 1;
}

function printOutcome(result: { ok: boolean }): void {
  printJson(result);
  if (!result.ok) Deno.exitCode = 1;
}
