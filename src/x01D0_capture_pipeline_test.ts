import * as facade from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import {
  captureText,
  reconcilePublished,
  reprojectRaw,
  verifyRawPayload,
} from "./x01D0_capture_pipeline.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 facade preserves capture pipeline bindings", () => {
  assert(facade.captureText === captureText, "capture binding drift");
  assert(facade.reprojectRaw === reprojectRaw, "reproject binding drift");
  assert(
    facade.verifyRawPayload === verifyRawPayload,
    "payload verification binding drift",
  );
  assert(
    facade.reconcilePublished === reconcilePublished,
    "reconciliation binding drift",
  );
});

Deno.test("private payload verification fails closed when bytes are absent", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-capture-" });
  const descriptor = await makeDescriptor(
    "RawDescriptor",
    "0.1.0",
    "h.deadbeefdead.raw.myc.md",
    { hash: "deadbeef" },
  );
  const result = await verifyRawPayload(root, descriptor);
  assert(!result.ok, "missing private bytes verified");
  assert(result.errors[0].includes("unavailable"), "wrong payload error");
});

Deno.test("durable reconciliation refuses records without proof", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-capture-" });
  const result = await reconcilePublished(root, [
    { fqdn: "missing-proof.myc.md", path: "public/forged.md", rawText: "x" },
  ]);
  assert(result.reconciled.length === 0, "unproved record reconciled");
  assert(result.rejected.length === 1, "rejection was not recorded");
});
