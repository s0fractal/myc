import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { trustTopology } from "./x3700_trust.ts";

Deno.test("x3700 trust — reads the live consensus graph", async () => {
  const o = await trustTopology();
  assertEquals(o.type, "trust_topology");
  const counts = o.counts as Record<string, number>;
  // the repo ships one PublishDescriptor + one WitnessDescriptor.
  assert(counts.published >= 1, "expected ≥1 published node");
  assert(counts.witnesses >= 1, "expected ≥1 witness");
});

Deno.test("x3700 trust — the published node is witnessed by claude (commitment matched)", async () => {
  const o = await trustTopology();
  const nodes = o.nodes as Array<Record<string, unknown>>;
  const node = nodes.find((n) =>
    String(n.target_fqdn).includes("2a10699544f3")
  );
  assert(node, "the shipped publish node should be present");
  const valid = node!.valid_witnesses as Array<{ actor: string }>;
  // the witness committed to the publish's exact commitment → it counts.
  assert(
    valid.some((w) => w.actor === "claude"),
    "claude's matching witness must be counted valid",
  );
  assertEquals(node!.state, "resonant");
});

Deno.test("x3700 trust — honesty: a node is never dropped, only labelled by state", async () => {
  const o = await trustTopology();
  const nodes = o.nodes as Array<Record<string, unknown>>;
  // every published node carries a state; dormant ones are kept visible.
  for (const n of nodes) {
    assert(
      ["resonant", "witnessed", "dormant"].includes(String(n.state)),
      `node ${n.target_fqdn} has a valid trust state`,
    );
  }
});
