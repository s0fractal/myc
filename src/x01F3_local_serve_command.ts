// Network-binding local resolver command.

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
import { verifyRawPayload } from "./x01D0_capture_pipeline.ts";
import {
  flagString,
  type LocalCommandContext,
} from "./x01E8_command_contract.ts";
import { printJson } from "./x01E9_cli_output.ts";

const DEFAULT_SERVE_PORT = 8787;
const PORT_ERROR = "serve --port must be a decimal integer from 1 to 65535";

export function parseServePort(
  value: string | boolean | undefined,
): number {
  if (value === undefined) return DEFAULT_SERVE_PORT;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(PORT_ERROR);
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(PORT_ERROR);
  }
  return port;
}

export function serveCommand({ root, flags }: LocalCommandContext) {
  const port = parseServePort(flags.port);
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
