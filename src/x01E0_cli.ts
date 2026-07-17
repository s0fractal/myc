// CLI orchestration and subprocess routing. Domain behavior lives in dedicated
// modules; this file only parses commands, renders output, and dispatches.

import { defaultRoot } from "./x0140_paths.ts";
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

async function handleRequest(
  root: string,
  request: Request,
): Promise<Response> {
  return await handleResolverRequest(root, request, {
    verifyRawPayload,
    verificationReceipts,
    explainAvailability,
    adapterDryRun,
    recipeDryRun,
  });
}

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

function flagBoolean(
  flags: Record<string, string | boolean>,
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

/** Human-friendly capture summary (the TTY default). `t myc capture` is the
 *  newcomer's CONTRIBUTE doorway; a person should see what happened and what it
 *  means — not a wall of hashes. Raw JSON is still emitted with --json or when
 *  piped (scripts/callers). Dogfood 2026-07-01. */
export function renderCaptureHuman(r: CaptureResult): string {
  return [
    "✓ your thought is in the network — keyless and content-addressed.",
    "",
    `  address:  ${r.rawFqdn}`,
    `  content:  ${r.artifactFqdn}`,
    `  hash:     ${r.rawHash}`,
    "",
    "  Its identity IS its hash — anyone can verify it by that hash. It carries NO",
    "  trust yet: a voice must witness it to give it standing (open contribution,",
    "  earned trust). Run again with --json for the full descriptor + transform set.",
  ].join("\n");
}

interface ShellCommandSpec {
  script: string;
  permissions: string[] | (() => string[]);
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
  if (!spec) return null;
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

  if (command === "capture") {
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
    return;
  }

  if (command === "resolve") {
    const fqdn = rest[0];
    if (!fqdn) throw new Error("resolve requires an FQDN");
    const record = await resolveFqdn(root, fqdn);
    if (!record) {
      console.log(
        JSON.stringify({ ok: false, error: "not-found", fqdn }, null, 2),
      );
      Deno.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ ok: true, ...record }, null, 2));
    return;
  }

  if (command === "verify") {
    const target = rest[0];
    if (!target) throw new Error("verify requires a path or FQDN");
    const path = target.startsWith("/")
      ? target
      : (await resolveFqdn(root, target))?.path;
    if (!path) {
      console.log(
        JSON.stringify({ ok: false, error: "not-found", target }, null, 2),
      );
      Deno.exitCode = 1;
      return;
    }
    const result = await verifyPath(path);
    const payload = flagBoolean(flags, "with-private", false)
      ? await verifyRawPayload(root, result.descriptor)
      : { ok: true, errors: [] };
    const ok = result.ok && payload.ok;
    console.log(JSON.stringify(
      {
        ok,
        path,
        fqdn: result.descriptor.fqdn,
        errors: [...result.errors, ...payload.errors],
      },
      null,
      2,
    ));
    if (!ok) Deno.exitCode = 1;
    return;
  }

  if (command === "verify-graph") {
    const result = await verifyGraph(root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "verify-projections") {
    const result = await verifyProjections(root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "index") {
    const path = await rebuildIndex(root);
    console.log(JSON.stringify({ ok: true, path }, null, 2));
    return;
  }

  // `reconcile-published [--source=URL|FILE]` (audit A11) — fold the live
  // membrane's KV-published records into the DURABLE git tree so they survive KV
  // eviction. Verifies each record's commitment (a forgery is refused, never
  // fossilized). Default source is the live /published endpoint.
  if (command === "reconcile-published") {
    const source = (flags.source as string) ?? "https://myc.md/published";
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
    console.log(JSON.stringify(
      {
        ok: result.rejected.length === 0,
        source,
        ...result,
        next: result.reconciled.length > 0
          ? "content is now in public/ (durable); run `deno task snapshot:publish` + commit to serve it from the baked snapshot"
          : "nothing new to reconcile",
      },
      null,
      2,
    ));
    if (result.rejected.length > 0) Deno.exitCode = 1;
    return;
  }

  if (command === "graph") {
    const path = await rebuildGraph(root);
    console.log(JSON.stringify({ ok: true, path }, null, 2));
    return;
  }

  if (command === "lineage") {
    const target = rest[0];
    if (!target) throw new Error("lineage requires a path or FQDN");
    const lineage = await lineageFor(root, target);
    console.log(JSON.stringify(lineage, null, 2));
    if (!lineage.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "explain") {
    const target = rest[0];
    if (!target) throw new Error("explain requires a path or FQDN");
    const explanation = await explainTarget(root, target);
    console.log(JSON.stringify(explanation, null, 2));
    if (explanation.ok === false) Deno.exitCode = 1;
    return;
  }

  if (command === "reproject") {
    const target = rest[0];
    if (!target) throw new Error("reproject requires a RawDescriptor FQDN");
    const result = await reprojectRaw(root, target, {
      actor: flagString(flags, "actor"),
      kind: flagString(flags, "kind"),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "adapter-dry-run") {
    const adapter = rest[0];
    if (!adapter) throw new Error("adapter-dry-run requires an adapter name");
    const result = await adapterDryRun(root, adapter);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "dry-run") {
    const target = rest[0];
    if (!target) throw new Error("dry-run requires a recipe fqdn");
    const result = await recipeDryRun(root, target);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "publish") {
    const target = rest[0];
    if (!target) throw new Error("publish requires a fqdn");
    // --derived-from <apply-id>: thread this publication to its SPORE/phase
    // apply receipt so the lifecycle reads end-to-end (x5800 proposal).
    const result = await publishTarget(
      root,
      target,
      flagString(flags, "derived-from"),
    );
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "import") {
    const path = rest[0];
    if (!path) throw new Error("import requires a file path");
    const result = await importGraph(root, path);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "witness") {
    const target = rest[0];
    if (!target) {
      throw new Error("witness requires a target PublishDescriptor fqdn");
    }
    const actor = flagString(flags, "actor") ?? "s0fractal";
    const result = await witnessTarget(root, target, actor);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "review") {
    const target = rest[0];
    const rating = rest[1];
    const comment = rest[2];
    if (!target || !rating) {
      throw new Error(
        "review requires a target fqdn and a rating (approve|reject|neutral)",
      );
    }
    const reviewer = flagString(flags, "reviewer") ?? "s0fractal";
    const result = await reviewTarget(root, target, reviewer, rating, comment);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "availability") {
    const target = rest[0];
    if (!target) throw new Error("availability requires a path or FQDN");
    const result = await explainAvailability(root, target);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) Deno.exitCode = 1;
    return;
  }

  if (command === "serve") {
    const port = Number(flagString(flags, "port") ?? "8787");
    const hostname = flagString(flags, "host") ?? "127.0.0.1";
    console.log(JSON.stringify({ ok: true, root, hostname, port }, null, 2));
    Deno.serve({ hostname, port }, async (request) => {
      const start = performance.now();
      const response = await handleRequest(root, request);
      const entry = auditEntry(request, response, performance.now() - start);
      console.log(formatAuditEntry(entry));
      return response;
    });
    return;
  }

  if (command === "demo") {
    const result = await captureText({
      root,
      text:
        "зроби маленький deterministic myc demo: raw -> descriptor -> naming proof -> artifact",
      actor: "s0fractal",
      kind: "message",
      storePayload: true,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

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
