import {
  classifyText as classifyFromFacade,
  makeDescriptor as makeFromFacade,
  slug as slugFromFacade,
} from "./x0100_myc.ts";
import { classifyText, makeDescriptor, slug } from "./x0110_descriptor_core.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 keeps descriptor-core exports as a compatibility façade", () => {
  assert(classifyFromFacade === classifyText, "classifyText binding drifted");
  assert(makeFromFacade === makeDescriptor, "makeDescriptor binding drifted");
  assert(slugFromFacade === slug, "slug binding drifted");
});

Deno.test("descriptor core keeps deterministic classification precedence", () => {
  assert(classifyText("Як це працює?").kind === "question", "question drifted");
  assert(
    classifyText("How should we implement this?").kind === "task",
    "task must retain precedence over question cues",
  );
  assert(classifyText("нова ідея").kind === "idea", "idea drifted");
  assert(classifyText("hello").kind === "message", "fallback drifted");
  assert(slug("  Hello, MYC!  ") === "hello-myc", "slug bytes drifted");
});

Deno.test("descriptor core binds the canonical body without façade state", async () => {
  const descriptor = await makeDescriptor(
    "TestDescriptor",
    "test.v0.1",
    "test.myc.md",
    { b: 1, a: 2 },
  );
  assert(
    descriptor.commitment.value ===
      "d3626ac30a87e6f7a6428233b3c68299976865fa5508e4267c5415c76af7a772",
    "descriptor commitment drifted",
  );
  assert(descriptor.commitment.covers === "descriptor.body", "cover drifted");
});
