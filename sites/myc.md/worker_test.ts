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
