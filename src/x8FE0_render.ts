#!/usr/bin/env -S deno run --allow-read
// myc/src/x8FE0_render.ts — the membrane, made visible for humans.
// position: 8/F → projection(8) × frontier(F) = the surface given a face
// placement_policy: projection
//
// The architect's founding vision named what the CLI does not give: "бачачи
// докази, графи, ФРАКТАЛИ" — for PEOPLE. This renders the membrane (organism +
// trust + lifecycle) into ONE self-contained HTML page — no server, no deploy,
// no network, no dependencies. Open it in any browser and see the four-substrate
// body, its trust (with authenticity), its mutations' lives, and the four roots
// where every fractal of provenance bottoms out. The JSON is embedded too, so
// the same artifact serves a human's eye and a machine's parser.
//
// Read-only: `t myc render > membrane.html` (HTML to stdout; the user redirects).
// Trust nodes are FRACTAL — each zooms into its own provenance (commitment →
// witnesses → apply thread → the four roots), recursively, via native <details>.

import { organism } from "./x8F00_organism.ts";
import { trustTopology } from "./x3700_trust.ts";
import { lifecycle } from "./x3F00_lifecycle.ts";

function esc(s: unknown): string {
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function renderHtml(): Promise<string> {
  const [body, trust, life] = await Promise.all([
    organism(),
    trustTopology(),
    lifecycle(),
  ]);
  const organs = body.organs as Array<Record<string, unknown>>;
  const mutation = body.mutation as Record<string, unknown>;
  const roots = body.four_roots as Array<Record<string, string>>;
  const tnodes = trust.nodes as Array<Record<string, unknown>>;
  const tc = trust.counts as Record<string, number>;
  const lc = life.counts as Record<string, number>;
  const threads = (life.threads as Array<Record<string, string>>) ?? [];

  const organColor: Record<string, string> = {
    omega: "#e06c75",
    liquid: "#61afef",
    trinity: "#c678dd",
    myc: "#98c379",
  };

  const organRows = organs.map((g) => {
    const c = organColor[String(g.substrate)] ?? "#abb2bf";
    return `<div class="organ" style="border-left-color:${c}">
      <div class="organ-head"><span class="sub" style="color:${c}">${
      esc(g.substrate)
    }</span>
      <span class="role">${esc(g.organ)}</span></div>
      <div class="proves">proves ${esc(g.proves)}</div>
      <div class="proof">via ${esc(g.proof_kind)}</div></div>`;
  }).join("\n");

  // A published node, rendered as a FRACTAL of its provenance: click to zoom in,
  // each level the same shape (a claim + its support), bottoming at the four
  // roots. Native <details> — recursion you can open, no script.
  const rootList = roots.map((r) =>
    `<li><span class="rsub">${esc(r.substrate)}</span> ${esc(r.root)}</li>`
  ).join("");
  function provenance(n: Record<string, unknown>): string {
    const auth = new Set(n.authenticated_witnesses as string[]);
    const witnesses = (n.valid_witnesses as string[]).map((a) =>
      `<details class="lvl"><summary>${
        auth.has(a)
          ? `🔏 ${esc(a)} — authenticated`
          : `· ${esc(a)} — integrity only`
      }</summary>
        <div class="leaf">attested voice <b>${esc(a)}</b>; ${
        auth.has(a)
          ? "content_sig verifies against the voice registry"
          : "no verified signature — bound by commitment, not yet by identity"
      }</div></details>`
    ).join("");
    const thread = n.derived_from
      ? `<details class="lvl"><summary>⟿ derived from apply ${
        esc(String(n.derived_from).slice(0, 16))
      }</summary><div class="leaf">this published mutation threads back to its apply receipt (proposed → applied → published).</div></details>`
      : "";
    return `<details class="lvl"><summary>🧬 commitment ${
      esc(String(n.commitment).slice(0, 16))
    } — binds the body</summary>
      <div class="leaf">sha256(body) — integrity: the content cannot change without breaking this.</div>
      ${witnesses}${thread}
      <details class="lvl"><summary>↓ bottoms out at the four roots</summary>
        <ul class="roots">${rootList}</ul></details></details>`;
  }
  const trustRows = tnodes.length === 0
    ? `<div class="muted">no published mutations yet</div>`
    : tnodes.map((n) => {
      const auth = new Set(n.authenticated_witnesses as string[]);
      const wit = (n.valid_witnesses as string[])
        .map((a) => auth.has(a) ? `${esc(a)} 🔏` : esc(a)).join(", ") || "—";
      const st = esc(n.state);
      return `<details class="tnode ${st}"><summary>
        <span class="reson">r=${esc(n.resonance)}</span>
        <span class="state">${st}</span>
        <span class="fqdn">${esc(n.target_fqdn)}</span></summary>
        <div class="wit">witnessed by ${wit} · zoom into provenance ↓</div>
        ${provenance(n)}</details>`;
    }).join("\n");

  // Two honest tracks. FINALITY: a proposal earns its terminal outcome only
  // through authenticated, evidenced, quorum-satisfying resolutions (codex P0.3) —
  // `final` lights up when any terminal outcome exists. CONSENSUS: an apply receipt
  // accrues trust on the membrane surface.
  const TERMINAL = [
    "implemented",
    "rejected",
    "superseded",
    "withdrawn",
    "expired",
  ];
  const terminalCount = TERMINAL.reduce((s, k) => s + (lc[k] ?? 0), 0);
  const renderFlow = (pairs: Array<[string, number]>) =>
    pairs.map(([s, c]) =>
      `<span class="lstate${c ? " on" : ""}">${s}${
        c ? ` <b>${c}</b>` : ""
      }</span>`
    ).join('<span class="arrow">→</span>');
  const finalityFlow = renderFlow([
    ["proposed", lc.proposed ?? 0],
    ["resolution_claimed", lc.resolution_claimed ?? 0],
    ["evidence_verified", lc.evidence_verified ?? 0],
    ["final", terminalCount],
  ]);
  const consensusFlow = renderFlow([
    ["applied", lc.applied ?? 0],
    ["published", lc.published ?? 0],
    ["witnessed", lc.witnessed ?? 0],
    ["reviewed", lc.reviewed ?? 0],
    ["resonant", lc.resonant ?? 0],
  ]);

  // the actual living mutations — so a person sees the membrane's own proposals
  // (✎ dormant), apply receipts (⟿), and consensus nodes (◆), not just counts.
  const mutations = (life.mutations as Array<Record<string, unknown>>) ?? [];
  const mutRows = mutations.map((m) => {
    const k = String(m.kind);
    const icon = k === "consensus" ? "◆" : k === "proposal" ? "✎" : "⟿";
    return `<div class="mut"><span class="micon">${icon}</span>
      <span class="mstate">${esc(m.state)}</span>
      <span class="mid">${esc(m.id)}</span>
      <span class="mdetail">${esc(m.detail)}</span></div>`;
  }).join("\n");

  const rootRows = roots.map((r) =>
    `<li><span class="rsub">${esc(r.substrate)}</span> ${esc(r.root)}</li>`
  ).join("\n");

  const data = JSON.stringify({ body, trust, lifecycle: life }, null, 0);

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>myc — the membrane</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#1a1d23; color:#abb2bf;
    font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  .wrap { max-width:820px; margin:0 auto; padding:2.5rem 1.25rem 4rem; }
  h1 { font-size:1.4rem; color:#e5e9f0; margin:0 0 .25rem; }
  .sub-title { color:#5c6370; margin:0 0 2rem; }
  h2 { font-size:.8rem; text-transform:uppercase; letter-spacing:.12em;
    color:#5c6370; border-bottom:1px solid #2c313a; padding-bottom:.4rem;
    margin:2.2rem 0 1rem; }
  .organ { border-left:3px solid; padding:.5rem .9rem; margin:.5rem 0;
    background:#21252b; border-radius:0 4px 4px 0; }
  .organ-head { display:flex; gap:.6rem; align-items:baseline; }
  .sub { font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
  .role { color:#e5e9f0; font-size:.85rem; }
  .proves { color:#abb2bf; } .proof { color:#5c6370; font-size:.85rem; }
  .mutation { background:#21252b; border:1px dashed #3a3f4b; border-radius:6px;
    padding:.7rem .9rem; margin:.6rem 0; }
  .mutation b { color:#d19a66; }
  .tnode { background:#21252b; border-radius:5px; padding:.5rem .9rem; margin:.4rem 0;
    border-left:3px solid #3a3f4b; }
  .tnode.resonant { border-left-color:#98c379; }
  .tnode.dormant { border-left-color:#5c6370; }
  .tnode.invalid { border-left-color:#e06c75; }
  .tnode-head { display:flex; gap:.7rem; }
  .reson { color:#98c379; font-weight:700; } .state { color:#5c6370; }
  .fqdn { color:#e5e9f0; font-size:.85rem; word-break:break-all; }
  .wit { color:#abb2bf; font-size:.85rem; }
  .flow { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center;
    background:#21252b; padding:.8rem; border-radius:6px; }
  .lstate { color:#5c6370; } .lstate.on { color:#e5e9f0; }
  .flabel { display:inline-block; width:5rem; color:#61afef; font-weight:700; }
  .lstate b { color:#61afef; } .arrow { color:#3a3f4b; }
  .muts { margin-top:.8rem; } .mut { display:flex; gap:.6rem; align-items:baseline;
    padding:.25rem 0; border-bottom:1px solid #23272e; font-size:.85rem; }
  .micon { width:1rem; } .mstate { width:5.5rem; color:#61afef; }
  .mid { color:#e5e9f0; } .mdetail { color:#5c6370; word-break:break-all; }
  ul.roots { list-style:none; padding:0; } ul.roots li { padding:.3rem 0;
    border-bottom:1px solid #23272e; }
  .rsub { display:inline-block; width:5.5rem; color:#c678dd; }
  .muted { color:#5c6370; } footer { margin-top:3rem; color:#3a3f4b;
    font-size:.8rem; border-top:1px solid #2c313a; padding-top:1rem; }
  .legend { color:#5c6370; font-size:.8rem; margin-top:.5rem; }
  details.tnode > summary, details.lvl > summary { cursor:pointer; list-style:none;
    user-select:none; }
  details.tnode > summary::-webkit-details-marker,
  details.lvl > summary::-webkit-details-marker { display:none; }
  details.tnode > summary { display:flex; gap:.7rem; align-items:baseline; }
  details.tnode[open] > summary { margin-bottom:.4rem; }
  .lvl { margin:.35rem 0 .35rem 1rem; padding-left:.8rem;
    border-left:1px solid #2c313a; }
  .lvl > summary { color:#abb2bf; padding:.15rem 0; }
  .lvl > summary:hover { color:#e5e9f0; }
  .leaf { color:#5c6370; font-size:.83rem; padding:.1rem 0 .3rem; }
  .leaf b { color:#98c379; }
</style></head>
<body><div class="wrap">
  <h1>🍄 myc — the membrane</h1>
  <p class="sub-title">one surface onto the four-substrate body and its mutations</p>

  <h2>the body</h2>
  ${organRows}
  <div class="mutation">⟿ <b>SPORE.v0</b> — the mutation unit · ${
    esc((mutation.germinated_total as number) ?? 0)
  } germinated into the membrane<br>
  <span class="legend">${esc(mutation.is)}</span></div>

  <h2>trust — integrity + authenticity</h2>
  <p class="legend">${esc(tc.published)} published · ${
    esc(tc.witnesses)
  } witnesses (${esc(tc.authenticated_witnesses)} 🔏 authenticated) · ${
    esc(tc.dormant)
  } dormant · ${esc(tc.invalid_descriptors)} invalid</p>
  ${trustRows}

  <h2>mutation lifecycle</h2>
  <div class="flow"><span class="flabel">finality</span> ${finalityFlow}</div>
  <div class="flow"><span class="flabel">consensus</span> ${consensusFlow}</div>
  ${
    terminalCount
      ? `<p class="legend">✓ ${terminalCount} proposal(s) reached a quorum-verified terminal outcome</p>`
      : ""
  }
  ${
    threads.length
      ? `<p class="legend">⛓ ${threads.length} apply→published thread(s) bound</p>`
      : ""
  }
  <div class="muts">${mutRows}</div>

  <h2>four roots — where every fractal of provenance bottoms out</h2>
  <ul class="roots">${rootRows}</ul>

  <footer>self-contained · no server · generated by <code>t myc render</code>.
  The full state is embedded below for machines.</footer>
  <script type="application/json" id="membrane-data">${esc(data)}</script>
</div></body></html>`;
}

export async function runCli(_args: string[] = Deno.args): Promise<void> {
  // Read-only: HTML to stdout. Redirect to a file —  `t myc render > membrane.html`
  // — and open it in any browser. No server, no write capability needed.
  console.log(await renderHtml());
}

if (import.meta.main) await runCli();
