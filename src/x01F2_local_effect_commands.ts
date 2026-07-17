// Effectful in-process CLI handlers. Domain writes remain in dedicated modules;
// this layer validates CLI input and renders their outcomes.

import { rebuildGraph } from "./x0160_graph.ts";
import { rebuildIndex } from "./x0170_projections.ts";
import {
  importGraph,
  publishTarget,
  reviewTarget,
  witnessTarget,
} from "./x01C0_mutation_lifecycle.ts";
import {
  captureText,
  reconcilePublished,
  reprojectRaw,
} from "./x01D0_capture_pipeline.ts";
import {
  flagBoolean,
  flagString,
  type LocalCommandContext,
  required,
} from "./x01E8_command_contract.ts";
import {
  printJson,
  printOutcome,
  renderCaptureHuman,
} from "./x01E9_cli_output.ts";

export async function captureCommand({ root, flags }: LocalCommandContext) {
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

export async function indexCommand({ root }: LocalCommandContext) {
  printJson({ ok: true, path: await rebuildIndex(root) });
}

export async function reconcilePublishedCommand(
  { root, flags }: LocalCommandContext,
) {
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

export async function graphCommand({ root }: LocalCommandContext) {
  printJson({ ok: true, path: await rebuildGraph(root) });
}

export async function reprojectCommand(
  { root, rest, flags }: LocalCommandContext,
) {
  const target = required(rest[0], "reproject requires a RawDescriptor FQDN");
  printJson(
    await reprojectRaw(root, target, {
      actor: flagString(flags, "actor"),
      kind: flagString(flags, "kind"),
    }),
  );
}

export async function publishCommand(
  { root, rest, flags }: LocalCommandContext,
) {
  const target = required(rest[0], "publish requires a fqdn");
  printOutcome(
    await publishTarget(root, target, flagString(flags, "derived-from")),
  );
}

export async function importCommand({ root, rest }: LocalCommandContext) {
  const path = required(rest[0], "import requires a file path");
  printOutcome(await importGraph(root, path));
}

export async function witnessCommand(
  { root, rest, flags }: LocalCommandContext,
) {
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

export async function reviewCommand(
  { root, rest, flags }: LocalCommandContext,
) {
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

export async function demoCommand({ root }: LocalCommandContext) {
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
