import worker from "./worker.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("myc.md worker serves the PWA shell", async () => {
  const response = await worker.fetch(new Request("https://myc.md/"));
  assert(response.status === 200, "root should return 200");
  assert(
    response.headers.get("content-type")?.includes("text/html"),
    "root should be html",
  );
  const body = await response.text();
  assert(
    body.includes("local-first resolver shell"),
    "shell text should render",
  );
  assert(body.includes("/manifest.webmanifest"), "manifest should be linked");
  assert(body.includes("tab-summary"), "shell should include summary tab");
  assert(
    body.includes("tab-availability"),
    "shell should include access tab",
  );
  assert(
    body.includes("availability-badge"),
    "shell should show availability badge",
  );
  assert(body.includes("version-value"), "shell should show resolver version");
  assert(body.includes("graph-report"), "shell should show graph report");
  assert(body.includes("load-graph-btn"), "shell should include graph loader");
  assert(
    body.includes("verification-btn"),
    "shell should include verification receipt button",
  );
  assert(
    body.includes("adapter-dry-run-btn"),
    "shell should include adapter dry-run button",
  );
  assert(body.includes("adapter-input"), "shell should include adapter input");
  assert(body.includes("edge-list"), "shell should include edge list");
  assert(
    body.includes("connection-note"),
    "shell should include connection note",
  );
  assert(body.includes("retry-btn"), "shell should include retry button");

  const app = await worker.fetch(new Request("https://myc.md/app.js"));
  assert(app.status === 200, "app script should return 200");
  const appBody = await app.text();
  assert(
    appBody.includes("/availability?target="),
    "app should call availability endpoint",
  );
  assert(
    appBody.includes("/adapter-dry-run?adapter="),
    "app should call adapter dry-run endpoint",
  );
  assert(
    appBody.includes("/verification"),
    "app should call verification endpoint",
  );
  assert(
    appBody.includes("/verification-source?name="),
    "app should call verification source endpoint",
  );
  assert(
    appBody.includes("VerificationReceipt"),
    "app should render verification receipts in index list",
  );
  assert(
    appBody.includes("/verify-projections"),
    "app should verify generated projections",
  );
  assert(
    appBody.includes("index_synced"),
    "app should show projection freshness fields",
  );
});

Deno.test("myc.md worker serves manifest and service worker", async () => {
  const manifest = await worker.fetch(
    new Request("https://myc.md/manifest.webmanifest"),
  );
  assert(manifest.status === 200, "manifest should return 200");
  const manifestBody = await manifest.json();
  assert(manifestBody.name === "myc.md", "manifest name should match");

  const serviceWorker = await worker.fetch(new Request("https://myc.md/sw.js"));
  assert(serviceWorker.status === 200, "service worker should return 200");
  const swBody = await serviceWorker.text();
  assert(swBody.includes("CACHE_NAME"), "service worker should cache shell");
});

Deno.test("myc.md worker falls back to shell for FQDN routes", async () => {
  const response = await worker.fetch(
    new Request("https://task.s0fractal.h.38bfd1d80cb9.myc.md/"),
  );
  assert(response.status === 200, "subdomain route should return shell");
  const body = await response.text();
  assert(body.includes("graph-canvas"), "shell should include graph canvas");
});

// --- provenance-corruption guard (GOAL: adversary / notary) ---
// This worker was found SYSTEMATICALLY escape-corrupted: every regex and the
// commitment separator carried a DOUBLE backslash, so the frontmatter regexes
// matched a literal "\r\n" (never real newlines) and the commitment hashed
// `fqdn + "\\n" + body` — diverging from the CLI's canonicalCommitment. The
// public PWA computed WRONG commitments and could not parse frontmatter at all.
// Fixed; these red the instant the corruption returns.
const WORKER_SRC = Deno.readTextFileSync(
  new URL("./worker.ts", import.meta.url),
);

Deno.test("worker.ts is not escape-corrupted (zero double-backslashes)", () => {
  const doubles = WORKER_SRC.match(/\\\\/g)?.length ?? 0;
  assert(
    doubles === 0,
    `worker.ts has ${doubles} double-backslash sequence(s) — its markdown/frontmatter regexes and the provenance-commitment separator would be broken, so the deployed PWA would compute wrong commitments.`,
  );
});

Deno.test("worker.ts commitment uses the canonical formula (fqdn + real newline + body.trimEnd)", () => {
  assert(
    WORKER_SRC.includes('fqdn + "\\n" + contentBody.trimEnd()'),
    "the PWA commitment must hash fqdn + a real newline + body.trimEnd(), matching src/x0200_resolve.ts canonicalCommitment (conformance vector 0cd0ac37…)",
  );
});

Deno.test("myc.md worker publishes the omega mesh relay multiaddr (CONNECT resonance)", async () => {
  const response = await worker.fetch(
    new Request("https://myc.md/.well-known/omega-relay"),
  );
  assert(response.status === 200, "relay endpoint should return 200");
  const body = await response.text();
  assert(
    body.startsWith("/dns4/relay.myc.md/tcp/443/wss/p2p/"),
    "should serve the relay wss multiaddr (the mesh bootstrap)",
  );
});
