// HTTP transport for the local read-only resolver plus the keyless proposal
// ingress. Domain services are explicit dependencies; this module never imports
// the CLI façade.

import { type Json } from "./verify_core.ts";
import { type MycDescriptor } from "./x0110_descriptor_core.ts";
import { nutritionForDescriptor } from "./x0130_nutrition.ts";
import { joinPath } from "./x0140_paths.ts";
import {
  descriptorAddresses,
  type DescriptorRecord,
  resolveFqdn,
  scanDescriptors,
  verifyPath,
} from "./x0150_descriptor_index.ts";
import { graphEdgeRecord, graphEdges, verifyGraph } from "./x0160_graph.ts";
import { rebuildIndex, verifyProjections } from "./x0170_projections.ts";
import {
  explainTarget,
  lineageFor,
  summarizeDescriptor,
} from "./x0180_lineage.ts";

const MYC_VERSION = "0.1.0";

interface ServiceOutcome {
  ok: boolean;
}

export interface ResolverServices {
  verifyRawPayload: (
    root: string,
    descriptor: MycDescriptor,
  ) => Promise<{ ok: boolean; errors: string[] }>;
  verificationReceipts: (root: string) => Promise<unknown[]>;
  explainAvailability: (
    root: string,
    target: string,
  ) => Promise<ServiceOutcome>;
  adapterDryRun: (
    root: string,
    adapter: string,
  ) => Promise<ServiceOutcome>;
  recipeDryRun: (
    root: string,
    target: string,
  ) => Promise<ServiceOutcome>;
}

export interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
}

export async function handleResolverRequest(
  root: string,
  request: Request,
  services: ResolverServices,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method === "POST" && url.pathname === "/propose") {
    return await propose(root, request);
  }

  if (request.method !== "GET") {
    return errorResponse("method-not-allowed", 405, request);
  }

  if (url.pathname === "/health") {
    return jsonResponse(
      {
        ok: true,
        service: "myc-resolver",
        version: MYC_VERSION,
        root_state: "local-private",
      },
      200,
      request,
    );
  }

  if (url.pathname === "/index") {
    const includePaths = truthyQuery(url, "paths");
    const records = await scanDescriptors(root);
    return jsonResponse(
      {
        ok: true,
        count: records.length,
        records: records.map((record) => indexRecord(record, includePaths)),
      },
      200,
      request,
    );
  }

  if (url.pathname === "/resolve") {
    const fqdn = url.searchParams.get("fqdn");
    if (!fqdn) return errorResponse("missing-fqdn", 400, request);
    const record = await resolveFqdn(root, fqdn);
    if (!record) return errorResponse("not-found", 404, request, { fqdn });
    return jsonResponse({ ok: true, ...record }, 200, request);
  }

  if (url.pathname === "/verify") {
    const target = url.searchParams.get("target");
    if (!target) return errorResponse("missing-target", 400, request);
    const path = target.startsWith("/")
      ? target
      : (await resolveFqdn(root, target))?.path;
    if (!path) return errorResponse("not-found", 404, request, { target });
    const result = await verifyPath(path);
    const payload = truthyQuery(url, "private")
      ? await services.verifyRawPayload(root, result.descriptor)
      : { ok: true, errors: [] };
    const ok = result.ok && payload.ok;
    return jsonResponse(
      {
        ok,
        path,
        fqdn: result.descriptor.fqdn,
        errors: [...result.errors, ...payload.errors],
      },
      ok ? 200 : 422,
      request,
    );
  }

  if (url.pathname === "/verify-graph") {
    const result = await verifyGraph(root);
    return jsonResponse(result, result.ok ? 200 : 422, request);
  }

  if (url.pathname === "/verify-projections") {
    const result = await verifyProjections(root);
    return jsonResponse(result, result.ok ? 200 : 422, request);
  }

  if (url.pathname === "/verification") {
    const receipts = await services.verificationReceipts(root);
    return jsonResponse(
      { ok: true, count: receipts.length, receipts },
      200,
      request,
    );
  }

  if (url.pathname === "/verification-source") {
    const name = url.searchParams.get("name");
    if (!name) return errorResponse("missing-name", 400, request);
    if (!/^[A-Za-z0-9._-]+\.md$/.test(name)) {
      return errorResponse("invalid-name", 400, request, { name });
    }
    const path = joinPath(root, "public", "verification", name);
    if (!(await exists(path))) {
      return errorResponse("not-found", 404, request, { name });
    }
    const source = await Deno.readTextFile(path);
    return jsonResponse({ ok: true, name, source }, 200, request);
  }

  if (url.pathname === "/graph") {
    const includePaths = truthyQuery(url, "paths");
    const edges = await graphEdges(root);
    return jsonResponse(
      {
        ok: true,
        count: edges.length,
        edges: edges.map((edge) => graphEdgeRecord(edge, includePaths)),
      },
      200,
      request,
    );
  }

  if (url.pathname === "/lineage") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const lineage = await lineageFor(root, target);
    return jsonResponse(lineage, lineage.ok ? 200 : 404, request);
  }

  if (url.pathname === "/explain") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const explanation = await explainTarget(root, target);
    return jsonResponse(
      explanation,
      explanation.ok === false ? 404 : 200,
      request,
    );
  }

  if (url.pathname === "/version") {
    return jsonResponse({ ok: true, version: MYC_VERSION }, 200, request);
  }

  if (url.pathname === "/descriptor") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const record = await resolveFqdn(root, target);
    if (!record) return errorResponse("not-found", 404, request, { target });
    return jsonResponse(
      { ok: true, descriptor: record.descriptor },
      200,
      request,
    );
  }

  if (url.pathname === "/source") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const record = await resolveFqdn(root, target);
    if (!record) return errorResponse("not-found", 404, request, { target });
    const source = await Deno.readTextFile(record.path);
    return jsonResponse({ ok: true, source }, 200, request);
  }

  if (url.pathname === "/summary") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const record = await resolveFqdn(root, target);
    if (!record) return errorResponse("not-found", 404, request, { target });
    const lineage = await lineageFor(root, target);
    const summary = summarizeDescriptor(record.descriptor, lineage);
    return jsonResponse({ ok: true, summary }, 200, request);
  }

  if (url.pathname === "/nutrition") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const record = await resolveFqdn(root, target);
    if (!record) return errorResponse("not-found", 404, request, { target });
    return jsonResponse(
      {
        ok: true,
        target,
        nutrition: nutritionForDescriptor(record.descriptor),
      },
      200,
      request,
    );
  }

  if (url.pathname === "/availability") {
    const target = targetQuery(url);
    if (!target) return errorResponse("missing-target", 400, request);
    const result = await services.explainAvailability(root, target);
    return jsonResponse(result, result.ok ? 200 : 404, request);
  }

  if (url.pathname === "/adapter-dry-run") {
    const adapter = url.searchParams.get("adapter");
    if (!adapter) return errorResponse("missing-adapter", 400, request);
    const result = await services.adapterDryRun(root, adapter);
    return jsonResponse(result, result.ok ? 200 : 404, request);
  }

  if (url.pathname === "/recipe-dry-run") {
    const target = url.searchParams.get("target");
    if (!target) return errorResponse("missing-target", 400, request);
    const result = await services.recipeDryRun(root, target);
    return jsonResponse(result, result.ok ? 200 : 404, request);
  }

  if (url.pathname === "/search") {
    const q = url.searchParams.get("q")?.toLowerCase();
    if (!q) return errorResponse("missing-query", 400, request);
    const records = await scanDescriptors(root);
    const results = records
      .filter((record) =>
        record.descriptor.fqdn.toLowerCase().includes(q) ||
        record.descriptor.commitment.value.toLowerCase().includes(q)
      )
      .map((record) => ({
        fqdn: record.descriptor.fqdn,
        type: record.descriptor.type,
        commitment: record.descriptor.commitment.value,
        aliases: descriptorAddresses(record.descriptor),
        nutrition: nutritionForDescriptor(record.descriptor) as unknown as Json,
      }));
    return jsonResponse(
      { ok: true, count: results.length, results },
      200,
      request,
    );
  }

  return errorResponse("not-found", 404, request, { path: url.pathname });
}

async function propose(root: string, request: Request): Promise<Response> {
  let payload: { proposal?: unknown; requires?: unknown; proposer?: unknown };
  try {
    payload = await request.json();
  } catch {
    return errorResponse("invalid-json", 400, request);
  }
  const proposal = typeof payload.proposal === "string"
    ? payload.proposal.trim()
    : "";
  const requires = typeof payload.requires === "string" ? payload.requires : "";
  const proposer =
    typeof payload.proposer === "string" && payload.proposer.trim()
      ? payload.proposer.trim()
      : "anon";
  if (!proposal) {
    return errorResponse("proposal text is required", 400, request);
  }

  const propPath = new URL("./x5800_propose.ts", import.meta.url).pathname;
  const proc = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      propPath,
      "--root",
      root,
      "--text",
      proposal,
      "--requires",
      requires,
      "--actor",
      proposer,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout } = await proc.output();
  const out = new TextDecoder().decode(stdout).trim();
  let result: Record<string, unknown> | null = null;
  try {
    result = JSON.parse(out);
  } catch { /* non-JSON output becomes a 502 below */ }
  if (result && typeof result.ok === "boolean") {
    if (result.ok) await rebuildIndex(root);
    return jsonResponse(result, result.ok ? 201 : 400, request);
  }
  return jsonResponse(
    { ok: false, error: out || "propose subprocess produced no result" },
    502,
    request,
  );
}

function targetQuery(url: URL): string | null {
  return url.searchParams.get("target") ?? url.searchParams.get("fqdn");
}

function truthyQuery(url: URL, name: string): boolean {
  return ["1", "true", "yes"].includes(
    (url.searchParams.get(name) ?? "").toLowerCase(),
  );
}

function indexRecord(
  record: DescriptorRecord,
  includePath: boolean,
): Record<string, Json> {
  return {
    ...(includePath ? { path: record.path } : {}),
    fqdn: record.descriptor.fqdn,
    type: record.descriptor.type,
    commitment: record.descriptor.commitment.value,
    aliases: descriptorAddresses(record.descriptor),
    nutrition: nutritionForDescriptor(record.descriptor) as unknown as Json,
  };
}

function errorResponse(
  code: string,
  status: number,
  request?: Request,
  details: Record<string, Json> = {},
): Response {
  return jsonResponse(
    {
      ok: false,
      error: code,
      message: errorMessage(code),
      ...details,
    },
    status,
    request,
  );
}

function errorMessage(code: string): string {
  const messages: Record<string, string> = {
    "method-not-allowed": "Only GET and OPTIONS are supported.",
    "missing-fqdn": "Required query parameter 'fqdn' is missing.",
    "missing-target": "Required query parameter 'target' or 'fqdn' is missing.",
    "missing-query": "Required query parameter 'q' is missing.",
    "missing-adapter": "Required query parameter 'adapter' is missing.",
    "missing-name": "Required query parameter 'name' is missing.",
    "invalid-name": "Receipt name must be a markdown file basename.",
    "not-found": "Requested MYC descriptor or route was not found.",
  };
  return messages[code] ?? code;
}

function jsonResponse(
  value: unknown,
  status = 200,
  request?: Request,
): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request),
    },
  });
}

function corsHeaders(request?: Request): HeadersInit {
  const origin = request?.headers.get("origin") ?? "";
  const allowOrigin = allowedOrigin(origin) ? origin : "null";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "origin",
  };
}

function allowedOrigin(origin: string): boolean {
  if (origin === "https://myc.md") return true;
  if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/\[::1\](?::\d+)?$/.test(origin)) return true;
  return origin === "";
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

export function auditEntry(
  request: Request,
  response: Response,
  durationMs: number,
  now = new Date(),
): AuditEntry {
  const url = new URL(request.url);
  return {
    timestamp: now.toISOString(),
    method: request.method,
    path: url.pathname,
    status: response.status,
    duration_ms: Math.round(durationMs),
  };
}

export function formatAuditEntry(entry: AuditEntry): string {
  return `[audit] ${entry.timestamp} | ${entry.method} ${entry.path} ${entry.status} ${entry.duration_ms}ms`;
}
