import { join } from "jsr:@std/path@1.1.4";
import {
  buildSnapshot,
  loadSnapshot,
  parseDescriptorBlock,
} from "./snapshot.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("loadSnapshot reads from a file and from an http url (transport)", async () => {
  const snap = {
    schema: "myc.public-snapshot.v0.1",
    record_count: 0,
    records: [],
  };

  // local file source
  const f = await Deno.makeTempFile({ suffix: ".json" });
  await Deno.writeTextFile(f, JSON.stringify(snap));
  const fromFile = await loadSnapshot(f);
  assert(fromFile.schema === snap.schema, "loads a snapshot from a file");

  // url source — fetch is injected, so no real network in the test
  const okFetch = ((_u: string | URL) =>
    Promise.resolve(
      new Response(JSON.stringify(snap), { status: 200 }),
    )) as unknown as typeof fetch;
  const fromUrl = await loadSnapshot(
    "https://peer.example/snapshot.json",
    okFetch,
  );
  assert(fromUrl.schema === snap.schema, "loads a snapshot from an http url");

  // a non-ok http response throws (never silently returns junk)
  const badFetch = ((_u: string | URL) =>
    Promise.resolve(
      new Response("nope", { status: 404 }),
    )) as unknown as typeof fetch;
  let threw = false;
  try {
    await loadSnapshot("https://peer.example/missing.json", badFetch);
  } catch {
    threw = true;
  }
  assert(threw, "an http error is surfaced, not swallowed");
});

Deno.test("buildSnapshot: deterministic, matches index, preserves raw + parses descriptor", async () => {
  const root = await Deno.makeTempDir({ prefix: "myc-snap-" });
  await Deno.mkdir(join(root, "public", "objects"), { recursive: true });
  const raw =
    '---\nmode: "X"\n---\n\n# hi\n\n```json\n{"type":"T","fqdn":"h.aaa.x.myc.md","commitment":{"value":"aaa"}}\n```\n';
  await Deno.writeTextFile(
    join(root, "public", "objects", "h.aaa.x.myc.md"),
    raw,
  );
  await Deno.writeTextFile(
    join(root, "public", "index.ndjson"),
    JSON.stringify({
      fqdn: "h.aaa.x.myc.md",
      path: "public/objects/h.aaa.x.myc.md",
      type: "T",
      commitment: "aaa",
    }) + "\n",
  );

  const a = await buildSnapshot(root);
  const b = await buildSnapshot(root);
  assert(JSON.stringify(a) === JSON.stringify(b), "snapshot is deterministic");
  assert(a.record_count === 1, "one record");
  assert(a.records[0].fqdn === "h.aaa.x.myc.md", "fqdn carried");
  assert(a.records[0].rawText === raw, "raw source preserved byte-for-byte");
  assert(
    (a.records[0].descriptor as { type?: string })?.type === "T",
    "descriptor parsed from the json block",
  );

  // an index entry whose file is absent is skipped, never invented
  await Deno.writeTextFile(
    join(root, "public", "index.ndjson"),
    JSON.stringify({
      fqdn: "h.aaa.x.myc.md",
      path: "public/objects/h.aaa.x.myc.md",
      type: "T",
      commitment: "aaa",
    }) + "\n" +
      JSON.stringify({
        fqdn: "h.bbb.y.myc.md",
        path: "public/objects/h.bbb.y.myc.md",
        type: "T",
        commitment: "bbb",
      }) + "\n",
  );
  const c = await buildSnapshot(root);
  assert(
    c.record_count === 1,
    "a missing referenced file is skipped, not invented",
  );
});

Deno.test("parseDescriptorBlock returns null for prose without a json block", () => {
  assert(
    parseDescriptorBlock("# just prose, no block\n") === null,
    "null on no block",
  );
  assert(
    parseDescriptorBlock("```json\n{bad json}\n```") === null,
    "null on bad json",
  );
});
