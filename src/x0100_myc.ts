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

export {
  type Json,
  sha256Hex,
  stableStringify,
  verifyCommitment,
} from "./verify_core.ts";
export {
  classifyText,
  makeDescriptor,
  type MycDescriptor,
  slug,
} from "./x0110_descriptor_core.ts";
export { verifyDescriptor } from "./x0120_descriptor_verify.ts";
export {
  nutritionForDescriptor,
  type NutritionLabel,
} from "./x0130_nutrition.ts";
export { defaultRoot, joinPath } from "./x0140_paths.ts";
export {
  parseDescriptorFile,
  resolveFqdn,
  scanDescriptors,
  verifyPath,
} from "./x0150_descriptor_index.ts";
export {
  graphEdges,
  type GraphVerificationResult,
  rebuildGraph,
  verifyGraph,
} from "./x0160_graph.ts";
export {
  type ProjectionVerificationResult,
  rebuildIndex,
  verifyProjections,
} from "./x0170_projections.ts";
export {
  explainTarget,
  lineageFor,
  type LineageResult,
  resolveTargetRecord,
} from "./x0180_lineage.ts";
export {
  type AuditEntry,
  auditEntry,
  formatAuditEntry,
  type ResolverServices,
} from "./x0190_http.ts";
export {
  adapterDryRun,
  type AdapterDryRunResult,
  type AvailabilityExplanation,
  explainAvailability,
  recipeDryRun,
  type RecipeDryRunResult,
  type VerificationReceiptRecord,
  verificationReceipts,
} from "./x01A0_policy_services.ts";
export {
  importGraph,
  type ImportGraphResult,
  type MutationResult,
  publishTarget,
  reviewTarget,
  witnessTarget,
} from "./x01C0_mutation_lifecycle.ts";
export {
  type CaptureOptions,
  type CaptureResult,
  captureText,
  type PublishedRecord,
  reconcilePublished,
  reprojectRaw,
  verifyRawPayload,
} from "./x01D0_capture_pipeline.ts";

export async function handleRequest(
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

export async function main(args: string[]): Promise<void> {
  // `coord <coordinate> [--graph|--lattice|--why|--stamp <signer>|--cat|--json]`
  // reaches the coordinate/provenance resolver (x0200_resolve.ts) through this
  // one CLI, so `myc` now spans BOTH address families: descriptor FQDNs (the
  // `resolve` command below — `task.actor.h.<hash>`) and graph coordinates
  // (`coord` — `xNNNN_handle`). x0200 owns the git+crypto proof modes and needs
  // --allow-run for git, so we shell it (matching the dispatcher-shells-organs
  // idiom) rather than import across the x01→x02 direction. Handled before
  // parseArgs so x0200's own flags pass through untouched.
  if (args[0] === "coord") {
    const resolverPath =
      new URL("./x0200_resolve.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-run",
        "--allow-env",
        resolverPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `organism` / `membrane` — the membrane self-portrait: the four substrates
  // as one proof-carrying body (LAW/omega · FIELD/liquid · MIND/trinity ·
  // MYCELIUM/myc), their proof-kinds, the four roots of trust, and the spores
  // germinated across substrate boundaries. Shelled (like `coord`) to keep
  // x0100 lean; TTY-aware (a readable body for humans, JSON for models).
  if (args[0] === "organism") {
    const organismPath =
      new URL("./x8F00_organism.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", organismPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `membrane` — the single surface: the body + its trust + its mutations'
  // lives, composed into one read-only view (the architect's founding vision).
  // `overview` is an alias — install.sh advertised it as the browse-the-network
  // path, but it was not a command (a newcomer got the raw help list). Dogfood.
  if (args[0] === "membrane" || args[0] === "overview") {
    const memPath = new URL("./x8FF0_membrane.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", memPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `trust` — trust topology / resonance ranking (ROADMAP Phase 9). Reads the
  // publish/witness/review consensus graph and surfaces a subjective resonance
  // signal per published mutation. Shelled (like organism/coord) to keep x0100
  // lean; TTY-aware.
  if (args[0] === "trust" || args[0] === "resonance") {
    const trustPath = new URL("./x3700_trust.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", trustPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `standing` — the temporal standing of signed descriptors (v0 current_registry_only
  // vs v1 historically verifiable). Makes the Temporal Trust Envelope verifier live.
  if (args[0] === "standing") {
    const sp =
      new URL("./x2F60_temporal_envelope.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", sp, ...args],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `temporal-sign` — emit a v1 Temporal Signature Envelope with the actor's OWN
  // key (codex P3 step 1). Outputs subject_for_ots for the architect's anchor
  // ceremony. Needs the private key (--allow-read + --allow-env HOME).
  if (args[0] === "temporal-verify") {
    const sp = new URL("./x2FA0_temporal_verify.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-run",
        "--allow-env",
        sp,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  if (args[0] === "temporal-sign") {
    const sp = new URL("./x2F90_temporal_sign.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-env",
        `--allow-write=${
          new URL("../public/temporal", import.meta.url).pathname
        }`,
        sp,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `ots-verify` — read/verify an OpenTimestamps proof through the authoritative
  // `ots` tool (codex P2). Embedded attestations via `ots info`; --verify runs the
  // on-chain check (unavailable without a Bitcoin source). Needs --allow-run.
  if (args[0] === "ots-verify") {
    const sp = new URL("./x2F80_ots_adapter.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", "--allow-run", sp, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `lifecycle` — the canonical mutation lifecycle (T3): one vocabulary across
  // apply-receipts (applied) and the consensus graph. Read-only; shelled.
  if (args[0] === "lifecycle") {
    const lifePath = new URL("./x3F00_lifecycle.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", lifePath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `propose` — propose a mutation INTO the membrane (the efferent half, dormant
  // slice). Writes a content-addressed, UNSIGNED, DORMANT ProposedMutationDescriptor
  // under public/proposals/. Effect class (writes); never signs/germinates.
  if (args[0] === "propose") {
    const propPath = new URL("./x5800_propose.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        propPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) {
      Deno.exitCode = code;
    } else {
      // keep public/index.ndjson in sync (as publish/witness/review do) so the
      // dormant proposal is indexed + resolvable and verify-projections stays green.
      await rebuildIndex(defaultRoot());
    }
    return;
  }

  // `petition` — external PETITION intake (codex x5000_956709 / claude x3300_956707):
  // a non-citizen agent's SIGNED, reference-mode submission that lands as a DORMANT
  // proposal (reusing propose). Verifies the Ed25519 envelope; never fetches; grants
  // nothing until witnessed. Effect class (writes).
  if (args[0] === "petition") {
    const petPath = new URL("./x5850_petition.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        petPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) {
      Deno.exitCode = code;
    } else {
      await rebuildIndex(defaultRoot());
    }
    return;
  }

  // `verify-deployment [url]` — Resonant Resolution step 1: verify a deployed
  // myc.md fallback serves ONLY what local source attests, by content hash
  // (trust the hash, not the host). Read-only; network. (chord x6000_954726)
  if (args[0] === "verify-deployment") {
    const vPath =
      new URL("../sites/myc.md/verify_deployment.ts", import.meta.url)
        .pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-net", "--allow-read", vPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `snapshot [--write path]` — Resonant Resolution: build a portable,
  // content-addressed export of the public network (index + descriptors + raw
  // source) — the content a fallback would serve + peers would exchange.
  // Read-only unless --write. (chord x6000_954726)
  if (args[0] === "snapshot") {
    const sPath =
      new URL("../sites/myc.md/snapshot.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        sPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `verify-snapshot <file>` — Resonant Resolution: verify a snapshot (e.g. one
  // received from a peer) with myc's canonical verifier — trust the hash, not the
  // host. Rehydrates to a temp root + verifyPath per record. Read-only to your tree.
  // (chord x6000_954726)
  if (args[0] === "verify-snapshot") {
    const vsPath =
      new URL("../sites/myc.md/verify_snapshot.ts", import.meta.url)
        .pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-net",
        vsPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `publish --witness <voice> --content <hash>` — witness→publish: a keyed voice
  // signs captured content and posts it to the membrane's /publish, so strangers
  // resolve it on myc.md with NO CF creds and NO maintainer deploy. Pre-verifies
  // every record with the canonical verifier before publishing.
  if (args[0] === "publish") {
    const pPath =
      new URL("../sites/myc.md/publish.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-run",
        "--allow-net",
        "--allow-env",
        pPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `import-snapshot <file> [--write]` — Resonant Resolution: receive a peer's
  // network export, verify it by hash, and merge the NEW verified records into your
  // local network. Dry-run unless --write; never overwrites; conflicts reported.
  // (chord x6000_954726)
  if (args[0] === "import-snapshot") {
    const isPath =
      new URL("../sites/myc.md/import_snapshot.ts", import.meta.url)
        .pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        "--allow-net",
        isPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `resolve-proposal` — record a terminal, commitment-bound outcome for a
  // dormant proposal (codex x6300_954228 P1). Effect class; rebuilds the index.
  if (args[0] === "resolve-proposal") {
    const resPath = new URL("./x5810_resolve_proposal.ts", import.meta.url)
      .pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        resPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    else await rebuildIndex(defaultRoot());
    return;
  }

  // `authenticate` — add a voice content_sig to a descriptor (witness), lifting
  // it from integrity to authenticity. Writes (frontmatter only; commitment
  // stable). Effect class; needs the user-level voice key.
  if (args[0] === "authenticate") {
    const authPath = new URL("./x2F50_voice_auth.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        authPath,
        ...args.slice(1),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `render` — the membrane as a self-contained HTML page (for human eyes).
  // Read-only; HTML to stdout (redirect to a file, open in any browser).
  if (args[0] === "render") {
    const renderPath = new URL("./x8FE0_render.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", renderPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

  // `effects` — the typed effect of every myc verb (the capability boundary,
  // mirrored by trinity's t myc passthrough). Read-only; shelled.
  if (args[0] === "effects") {
    const fxPath = new URL("./x4A10_verb_effects.ts", import.meta.url).pathname;
    const proc = new Deno.Command("deno", {
      args: ["run", "--allow-read", fxPath, ...args.slice(1)],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await proc.output();
    if (code !== 0) Deno.exitCode = code;
    return;
  }

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

if (import.meta.main) {
  main(Deno.args).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  });
}
