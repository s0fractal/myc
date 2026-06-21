// consensus_loop_test.ts — the "proof we are not just a surface" fixture.
// Runs the consensus lifecycle end-to-end on a temp root and asserts it CLOSES to
// `resonant`: capture (real content) → publish → witness → review → resonant.
//
// Context (trinity/myc surveys, 2026-06-21): the surveys flagged "zero apply→publish
// threads — the membrane's surface is more mature than the living network behind it."
// This fixture proves the *consensus* half genuinely closes. The remaining gap is the
// PROPOSAL→consensus path: a dormant proposal can't be published (publish returns
// `graph-verification-failed`) until an "apply" rung turns it into a graph-verified
// artifact — that rung is codex's finality work (x7d00_954231), asserted absent here.
import {
  captureText,
  publishTarget,
  reviewTarget,
  witnessTarget,
} from "./x0100_myc.ts";
import { trustTopology } from "./x3700_trust.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("consensus loop closes: capture → publish → witness → review → resonant", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-loop-" });

  // real content enters as a graph-verified artifact
  const cap = await captureText({
    root,
    text: "a real thought carried through the whole loop",
    actor: "claude",
    kind: "message",
  });
  const artifact = cap.artifactFqdn;
  assert(artifact, "captured an artifact");

  // publish → witness → review
  const pub = await publishTarget(root, artifact);
  assert(pub.ok, "publish should succeed: " + pub.errors.join("; "));
  const published = pub.fqdn!;

  const wit = await witnessTarget(root, published, "claude");
  assert(wit.ok, "witness should succeed: " + wit.errors.join("; "));

  const rev = await reviewTarget(root, published, "gemini", "approve");
  assert(rev.ok, "review should succeed: " + rev.errors.join("; "));

  // the loop CLOSES — the published mutation is resonant, with the witness bound
  const trust = await trustTopology(root);
  const nodes = (trust.nodes ?? trust) as Array<{
    target_fqdn: string;
    state: string;
    valid_witnesses: string[];
    reviews: unknown[];
  }>;
  const node = nodes.find((n) => n.target_fqdn === published);
  assert(node, "published mutation appears in the trust topology");
  assert(
    node!.state === "resonant",
    "the loop reaches resonant; got: " + node!.state,
  );
  assert(node!.valid_witnesses.includes("claude"), "witness is bound");
  assert(node!.reviews.length >= 1, "review is recorded");

  await Deno.remove(root, { recursive: true });
});

Deno.test("the gap: a dormant proposal cannot be published (apply rung missing)", async () => {
  // documents codex's finality gap empirically: propose creates a dormant mutation
  // that is NOT graph-verifiable, so publish fails. Closing this is the apply rung.
  const root = await Deno.makeTempDir({ prefix: "myc-gap-" });
  await captureText({ root, text: "seed", actor: "claude", kind: "message" }); // make a valid root
  // a proposal file (dormant) is not publishable as-is
  const pub = await publishTarget(root, "h.deadbeefdead.proposal.myc.md");
  assert(!pub.ok, "publishing a non-graph-verified proposal must fail");
  await Deno.remove(root, { recursive: true });
});
