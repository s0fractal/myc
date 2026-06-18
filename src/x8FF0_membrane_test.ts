import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { membrane } from "./x8FF0_membrane.ts";

Deno.test("x8FF0 membrane — composes body + trust + lifecycle into one surface", async () => {
  const o = await membrane();
  assertEquals(o.type, "membrane");
  assertEquals((o.body as { type: string }).type, "organism");
  assertEquals((o.trust as { type: string }).type, "resonance_projection");
  assertEquals((o.lifecycle as { type: string }).type, "lifecycle");
});

Deno.test("x8FF0 membrane — offers depth-pointers into the deeper views", async () => {
  const o = await membrane();
  const deeper = o.deeper as Record<string, string>;
  const cmds = Object.values(deeper).join(" ");
  for (
    const c of [
      "t myc organism",
      "t myc trust",
      "t myc lifecycle",
      "t myc effects",
    ]
  ) {
    assert(cmds.includes(c), `membrane should point at ${c}`);
  }
});
