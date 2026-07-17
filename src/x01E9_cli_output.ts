// Shared CLI rendering and exit semantics for local command handlers.

import type { CaptureResult } from "./x01D0_capture_pipeline.ts";

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

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printFailure(value: unknown): void {
  printJson(value);
  Deno.exitCode = 1;
}

export function printOutcome(result: { ok: boolean }): void {
  printJson(result);
  if (!result.ok) Deno.exitCode = 1;
}
