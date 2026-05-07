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
  assert(body.includes("version-value"), "shell should show resolver version");
  assert(body.includes("graph-report"), "shell should show graph report");
  assert(body.includes("load-graph-btn"), "shell should include graph loader");
  assert(body.includes("edge-list"), "shell should include edge list");
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
