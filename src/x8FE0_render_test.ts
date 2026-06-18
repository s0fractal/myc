import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderHtml } from "./x8FE0_render.ts";

Deno.test("x8FE0 render — produces a self-contained HTML document", async () => {
  const html = await renderHtml();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, "<title>myc — the membrane</title>");
  // self-contained: no external scripts/styles/network
  assert(!/<script[^>]+src=/.test(html), "no external scripts");
  assert(!/<link[^>]+stylesheet/.test(html), "no external stylesheets");
  assert(!/https?:\/\//.test(html.replace(/lang="en"/, "")), "no network URLs");
});

Deno.test("x8FE0 render — shows the four substrates and embeds the data", async () => {
  const html = await renderHtml();
  for (const sub of ["omega", "liquid", "trinity", "myc"]) {
    assertStringIncludes(html, sub);
  }
  assertStringIncludes(html, "four roots");
  assertStringIncludes(html, "mutation lifecycle");
  // the machine-readable payload is embedded
  assertStringIncludes(html, 'id="membrane-data"');
  assertStringIncludes(html, "resonance_projection"); // trust json embedded
});
