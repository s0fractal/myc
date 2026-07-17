import { nutritionForDescriptor as nutritionFromFacade } from "./x0100_myc.ts";
import { makeDescriptor } from "./x0110_descriptor_core.ts";
import {
  nutritionForDescriptor,
  payloadStateForDescriptor,
} from "./x0130_nutrition.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 keeps nutrition as a compatibility façade", () => {
  assert(nutritionFromFacade === nutritionForDescriptor, "binding drifted");
});

Deno.test("nutrition is derived without mutating descriptor identity", async () => {
  const descriptor = await makeDescriptor(
    "ArtifactDescriptor",
    "artifact.v0.1",
    "artifact.myc.md",
    {
      payload: { state: "private" },
      classification: { confidence: "low" },
    },
  );
  const before = JSON.stringify(descriptor);
  const nutrition = nutritionForDescriptor(descriptor);
  assert(nutrition.status === "speculative", "low confidence must be visible");
  assert(nutrition.payload_state === "private", "payload state drifted");
  assert(nutrition.labels.includes("private"), "payload label is missing");
  assert(JSON.stringify(descriptor) === before, "projection mutated identity");
});

Deno.test("nutrition expiry and payload fallback remain deterministic", async () => {
  const descriptor = await makeDescriptor(
    "RawDescriptor",
    "raw.v0.1",
    "raw.myc.md",
    {
      payload_state: "sealed",
      nutrition: { expires_at: "2026-01-01T00:00:00.000Z" },
    },
  );
  const nutrition = nutritionForDescriptor(
    descriptor,
    new Date("2026-07-17T00:00:00.000Z"),
  );
  assert(
    payloadStateForDescriptor(descriptor) === "sealed",
    "fallback drifted",
  );
  assert(nutrition.status === "stale", "expired label must be stale");
  assert(nutrition.freshness === "stale", "freshness must be stale");
  assert(nutrition.reasons.length === 1, "expiry reason must be explicit");
});
