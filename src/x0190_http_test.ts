import * as facade from "./x0100_myc.ts";
import {
  auditEntry,
  formatAuditEntry,
  handleResolverRequest,
  type ResolverServices,
} from "./x0190_http.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stubServices(): ResolverServices {
  return {
    verifyRawPayload: () => Promise.resolve({ ok: true, errors: [] }),
    verificationReceipts: () => Promise.resolve([]),
    explainAvailability: (_root, target) =>
      Promise.resolve({ ok: true, target, boundary: "injected" }),
    adapterDryRun: (_root, adapter) =>
      Promise.resolve({ ok: true, adapter, boundary: "injected" }),
    recipeDryRun: (_root, target) =>
      Promise.resolve({ ok: true, target, boundary: "injected" }),
  };
}

Deno.test("x0100 facade preserves HTTP audit bindings", () => {
  assert(facade.auditEntry === auditEntry, "audit binding drift");
  assert(facade.formatAuditEntry === formatAuditEntry, "format binding drift");
});

Deno.test("resolver transport matches the x0100 compatibility facade", async () => {
  const requests = [
    new Request("http://localhost/health"),
    new Request("http://localhost/version", {
      headers: { origin: "https://myc.md" },
    }),
    new Request("http://localhost/missing"),
    new Request("http://localhost/version", { method: "POST" }),
    new Request("http://localhost/version", { method: "OPTIONS" }),
  ];

  for (const request of requests) {
    const direct = await handleResolverRequest("/unused", request.clone(), {
      ...stubServices(),
    });
    const compatible = await facade.handleRequest("/unused", request.clone());
    assert(
      direct.status === compatible.status,
      `${request.method} status drift`,
    );
    assert(
      direct.headers.get("access-control-allow-origin") ===
        compatible.headers.get("access-control-allow-origin"),
      `${request.method} CORS drift`,
    );
    assert(await direct.text() === await compatible.text(), "body drift");
  }
});

Deno.test("resolver delegates domain-only routes through explicit services", async () => {
  const response = await handleResolverRequest(
    "/unused",
    new Request("http://localhost/availability?target=demo.myc.md"),
    stubServices(),
  );
  const body = await response.json();
  assert(response.status === 200, "delegated route should succeed");
  assert(body.target === "demo.myc.md", "target delegation drift");
  assert(body.boundary === "injected", "service boundary was bypassed");
});

Deno.test("audit output excludes query payload and rounds duration", () => {
  const entry = auditEntry(
    new Request("http://localhost/search?q=private"),
    new Response(null, { status: 200 }),
    1.6,
    new Date("2026-07-17T00:00:00.000Z"),
  );
  assert(entry.path === "/search", "audit leaked query data");
  assert(entry.duration_ms === 2, "duration rounding drift");
  assert(!formatAuditEntry(entry).includes("private"), "formatted query leak");
});
