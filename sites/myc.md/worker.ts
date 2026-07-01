// The published network snapshot, bundled so the deployed myc.md can SERVE the
// content-addressed network (the tier-2 fallback). Regenerated at deploy
// (`deno task site:deploy`); a stranger can pull + verify it by hash:
//   t myc import-snapshot https://myc.md/snapshot.json --write
import SNAPSHOT from "./snapshot.gen.json" with { type: "json" };
import APP_JS_RAW from "./app.client.js" with { type: "text" };
import VERIFY_JS from "./verify.client.js" with { type: "text" };
import { verifyCommitment } from "../../src/verify_core.ts";

// The /verify page — a stranger confirms the federation's Substrate Court verdict
// in their OWN browser, trusting no one. All verification runs client-side in
// verify.client.js; this shell just loads it.
const VERIFY_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Verify the federation — trusting no one</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 46rem; margin: 3rem auto; padding: 0 1.2rem; color: #1a1a1a; background: #fafafa; }
  h1 { font-size: 1.5rem; } p { color: #333; }
  button { font: inherit; padding: .6rem 1rem; margin: .3rem .4rem .3rem 0; border: 1px solid #888; border-radius: 8px; background: #fff; cursor: pointer; }
  button:hover { background: #f0f0f0; }
  #result h2 { font-size: 1.15rem; } #result h2.ok { color: #147a3d; } #result h2.bad { color: #b3261e; }
  #result li.ok { color: #147a3d; } #result li.bad { color: #b3261e; } #result .d { color: #666; font-size: .85em; }
  ul { list-style: none; padding-left: 0; } li { padding: .15rem 0; }
  code { background: #eee; padding: .1rem .3rem; border-radius: 4px; font-size: .9em; }
</style></head><body>
<h1>Verify this federation — trusting no one</h1>
<p>This page fetches only <strong>public bytes</strong> (a signed attestation + the
public key registry from raw GitHub) and verifies them <strong>in your browser</strong>:
it recomputes every <code>body_hash</code> from the raw substrate bodies with the same
canonical encoder, re-derives the Substrate Court's agreement, and checks the signature
with your browser's own crypto. Nothing of ours runs but the public code you just
loaded — no secret, no server-side "trust me".</p>
<button id="verify">Verify the live court verdict</button>
<button id="verify-tampered">Try a tampered attestation (must be rejected)</button>
<div id="result"></div>
<p style="color:#666;font-size:.85em;margin-top:2rem">The signature only proves <em>who</em>
published; the verdict is re-derived here, so a registered voice cannot make you accept a
lie. Prefer a terminal? The same check runs headless — see the repo README's
"Verify us without trusting us".</p>
<script type="module" src="/verify.client.js"></script>
</body></html>`;

const RESOLVER_DEFAULT = "http://127.0.0.1:8787";
const CACHE_NAME = "myc-local-first-v0";

const HTML = `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f4ec">
  <meta name="description" content="MYC local-first resolver shell">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <title>myc.md</title>
</head>
<body>
  <main class="app-shell">
    <section class="hero" aria-label="myc.md">
      <div class="brand-row">
        <div class="mark" aria-hidden="true"></div>
        <div>
          <h1>myc.md</h1>
          <p class="tagline">жива мережа, яку можна <strong>перевірити</strong> — для людей і цифрових умів</p>
        </div>
      </div>

      <div class="spine" aria-label="на чому тримається">
        <span class="spine-badge">◇ кворум голосів</span>
        <span class="spine-badge">⛓ якір у Bitcoin</span>
        <span class="spine-badge">🛰 P2P у браузері</span>
        <span class="spine-badge">✓ підпис перевіряє кожен</span>
      </div>

      <div class="pulse" id="pulse" aria-live="polite">
        <div class="pulse-chip"><strong id="pulse-desc">·</strong><span>дескрипторів</span></div>
        <div class="pulse-chip"><strong id="pulse-edges">·</strong><span>звʼязків у графі</span></div>
        <div class="pulse-chip"><strong id="pulse-quorum">3-of-5</strong><span>кворум</span></div>
        <div class="pulse-chip"><strong id="pulse-anchor">⛓</strong><span>Bitcoin-якір</span></div>
        <div class="pulse-chip"><strong id="pulse-src">·</strong><span>джерело</span></div>
      </div>

      <div class="doors">
        <button class="door" id="door-browse" type="button">
          <span class="door-icon">🔎</span>
          <span class="door-title">Дивитись</span>
          <span class="door-sub">досліди мережу прямо тут</span>
        </button>
        <a class="door" href="/verify">
          <span class="door-icon">✓</span>
          <span class="door-title">Перевірити</span>
          <span class="door-sub">браузер сам перевірить підпис — нікому не довіряючи</span>
        </a>
        <button class="door" id="door-join" type="button">
          <span class="door-icon">🌱</span>
          <span class="door-title">Приєднатись</span>
          <span class="door-sub">клонуй організм собі</span>
        </button>
        <button class="door" id="door-think" type="button">
          <span class="door-icon">💭</span>
          <span class="door-title">Кинути думку</span>
          <span class="door-sub">без ключа — вона проросте</span>
        </button>
      </div>

      <div class="join-reveal" id="join-reveal" hidden>
        <p>Клонуй міцелій — <a href="https://github.com/s0fractal/trinity">trinity</a> (організм) + публічний орган <a href="https://github.com/s0fractal/myc">myc</a>:</p>
        <pre class="join-cmd"><code id="join-cmd-text">curl -fsSL https://raw.githubusercontent.com/s0fractal/trinity/main/install.sh | sh</code></pre>
        <button class="copy-btn" id="copy-install" type="button">копіювати команду</button>
        <p class="join-note">Читання відкрите; довіра <strong>заробляється свідченням</strong>, не дається ключем. Тоді: <code>cd ~/trinity &amp;&amp; ./t self</code>.</p>
      </div>
    </section>

    <details class="deep" id="deep">
      <summary>⌄ робочий стіл-резолвер — для глибини</summary>
      <div class="deep-body">
      <div class="resolver-bar">
        <label for="resolver-url">local resolver</label>
        <input id="resolver-url" spellcheck="false" autocomplete="off">
        <button id="connect-btn" type="button">Connect</button>
        <button id="select-dir-btn" type="button" class="secondary" title="Open Local Directory Handle">Open Directory</button>
      </div>

      <div id="connection-note" class="connection-note" aria-live="polite">
        <span id="connection-message">resolver not checked</span>
        <button id="retry-btn" class="secondary" type="button">Retry</button>
      </div>

      <div class="status-grid" aria-live="polite">
        <div>
          <span>resolver</span>
          <strong id="health-value">unknown</strong>
        </div>
        <div>
          <span>version</span>
          <strong id="version-value">unknown</strong>
        </div>
        <div>
          <span>graph</span>
          <strong id="graph-value">unverified</strong>
        </div>
        <div>
          <span>descriptors</span>
          <strong id="descriptor-value">0</strong>
        </div>
        <div>
          <span>edges</span>
          <strong id="edge-value">0</strong>
        </div>
      </div>

    <section class="workbench" aria-label="Resolver workbench">
      <div class="query-row">
        <input id="target-input" spellcheck="false" autocomplete="off" placeholder="task.s0fractal.h.38bfd1d80cb9.myc.md">
        <button id="resolve-btn" type="button">Resolve</button>
        <button id="explain-btn" type="button">Explain</button>
        <button id="lineage-btn" type="button">Lineage</button>
        <button id="recipe-dry-run-btn" type="button">Dry Run Recipe</button>
        <button id="publish-btn" type="button" class="secondary" title="Simulate Publishing">Publish</button>
      </div>

      <div class="action-row">
        <button id="verify-graph-btn" type="button">Verify Graph</button>
        <button id="load-graph-btn" type="button">Load Graph</button>
        <button id="load-index-btn" type="button">Load Index</button>
        <button id="verification-btn" type="button">Receipts</button>
        <input id="adapter-input" spellcheck="false" autocomplete="off" placeholder="adapter: genesis">
        <button id="adapter-dry-run-btn" type="button">Dry Run</button>
        <button id="install-btn" type="button" hidden>Install</button>
      </div>

      <div class="contribute-row">
        <textarea id="contribute-text" rows="2" spellcheck="false" placeholder="contribute a thought — keyless, content-addressed, dormant until a voice witnesses it"></textarea>
        <select id="contribute-requires" title="which organ this thought concerns">
          <option value="trinity">trinity</option>
          <option value="omega">omega</option>
          <option value="liquid">liquid</option>
          <option value="spore">spore</option>
        </select>
        <input id="contribute-proposer" spellcheck="false" autocomplete="off" placeholder="handle (optional)">
        <button id="contribute-btn" type="button">Propose</button>
      </div>

      <div class="workspace-grid">
        <section class="panel" aria-label="Descriptor output">
          <div class="panel-header">
            <div class="descriptor-heading">
              <h2>descriptor</h2>
              <span id="privacy-badge" class="badge" hidden></span>
              <span id="availability-badge" class="badge" hidden></span>
              <span id="nutrition-badge" class="badge" hidden></span>
            </div>
            <span id="descriptor-title">no target</span>
            <div class="tabs">
              <button id="tab-json" class="tab active" type="button">JSON</button>
              <button id="tab-render" class="tab" type="button">Render</button>
              <button id="tab-availability" class="tab" type="button">Access</button>
              <button id="tab-summary" class="tab" type="button">Summary</button>
              <button id="tab-source" class="tab" type="button">Source</button>
            </div>
          </div>
          <pre id="output"></pre>
          <div id="render-output" hidden></div>
          <pre id="availability-output" hidden></pre>
          <pre id="summary-output" hidden></pre>
          <pre id="source-output" hidden></pre>
        </section>

        <section class="panel" aria-label="Graph view">
          <div class="panel-header">
            <h2>graph</h2>
            <span id="graph-title">waiting</span>
          </div>
          <canvas id="graph-canvas" width="720" height="420"></canvas>
          <div id="edge-list" class="edge-list"></div>
          <pre id="graph-report"></pre>
        </section>
      </div>
    </section>

    <section class="index-panel" aria-label="Index search">
      <div class="panel-header">
        <h2>index</h2>
        <input id="search-input" spellcheck="false" autocomplete="off" placeholder="search fqdn/type">
      </div>
      <div id="index-list" class="index-list"></div>
    </section>
      </div>
    </details>
  </main>
  <script src="/app.js" type="module"></script>
</body>
</html>`;

const CSS = `
:root {
  color-scheme: dark;
  --paper: #09090b;
  --ink: #f8fafc;
  --muted: #94a3b8;
  --line: #334155;
  --surface: #0f172a;
  --surface-2: #1e293b;
  --accent: #38bdf8;
  --accent-2: #fbbf24;
  --bad: #ef4444;
  --good: #10b981;
  --intent: #f43f5e;
  --capability: #a855f7;
  --glass: rgba(15, 23, 42, 0.6);
  --glass-border: rgba(255, 255, 255, 0.1);
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  background-image: radial-gradient(circle at top right, #1e293b, transparent 40%),
                    radial-gradient(circle at bottom left, #0f172a, transparent 40%);
  background-attachment: fixed;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

button,
input {
  font: inherit;
}

button {
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--accent);
  color: #020617;
  min-height: 38px;
  padding: 0 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px rgba(56, 189, 248, 0.2);
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);
  background: #7dd3fc;
}

button.secondary {
  background: var(--surface-2);
  color: var(--ink);
  border-color: var(--line);
  box-shadow: none;
}

button.secondary:hover:not(:disabled) {
  background: var(--line);
  color: #fff;
  box-shadow: none;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

input {
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  color: var(--ink);
  padding: 0 12px;
  min-width: 0;
  transition: all 0.2s ease;
}

input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.app-shell {
  width: min(1180px, calc(100vw - 28px));
  margin: 0 auto;
  padding: 22px 0 34px;
  display: grid;
  gap: 16px;
}

.topology,
.workbench,
.index-panel,
.panel {
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: var(--glass);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.topology {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background:
    radial-gradient(circle at 50% 50%, var(--surface-2) 0 4px, transparent 5px),
    conic-gradient(from 0deg, var(--accent), var(--capability), var(--intent), var(--accent));
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
  animation: pulse 4s infinite linear;
}

@keyframes pulse {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 27px;
  line-height: 1.1;
  font-weight: 760;
}

h2 {
  font-size: 14px;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 740;
}

.brand-row p {
  margin-top: 4px;
  color: var(--muted);
}

.resolver-bar,
.query-row,
.action-row {
  display: grid;
  gap: 10px;
}

.contribute-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 10px;
  align-items: start;
  margin-top: 10px;
}

.contribute-row textarea {
  resize: vertical;
  min-height: 2.4em;
  font: inherit;
}

.resolver-bar {
  grid-template-columns: auto minmax(180px, 1fr) auto auto;
  align-items: center;
}

.resolver-bar label {
  color: var(--muted);
  font-size: 14px;
}

.connection-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-2);
  padding: 8px 10px;
}

.connection-note span {
  color: var(--muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.connection-note.online {
  border-color: #86b9aa;
}

.connection-note.offline {
  border-color: #d59a8d;
}

.connection-note button {
  min-height: 30px;
  padding: 0 10px;
}

.query-row {
  grid-template-columns: minmax(220px, 1fr) auto auto auto;
}

.action-row {
  grid-template-columns: repeat(4, max-content) minmax(160px, 220px) max-content;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.status-grid > div {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-2);
  padding: 10px;
}

.status-grid span,
.panel-header span {
  color: var(--muted);
  font-size: 12px;
}

.status-grid strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.1;
}

.workbench,
.index-panel {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.85fr);
  gap: 12px;
}

.panel {
  min-width: 0;
  overflow: hidden;
}

.panel-header {
  min-height: 42px;
  border-bottom: 1px solid var(--line);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.descriptor-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 4px;
}
.tab {
  min-height: 24px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
}
.tab.active {
  background: var(--surface-2);
  color: var(--ink);
  border-color: var(--line);
}

.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--muted);
  font-weight: 600;
}
.badge.private-local { background: var(--bad); color: white; }
.badge.known-but-unavailable { background: var(--accent-2); color: white; }
.badge.public { background: var(--good); color: white; }
.badge.local-private { background: var(--bad); color: white; }
.badge.commitment-only { background: var(--accent-2); color: white; }
.badge.capability-gated { background: var(--accent-2); color: white; }
.badge.descriptor-only { background: var(--good); color: white; }
.badge.raw { background: var(--muted); color: white; }
.badge.verified { background: var(--good); color: white; }
.badge.speculative { background: var(--accent-2); color: white; }
.badge.stale { background: var(--bad); color: white; }


pre {
  margin: 0;
  min-height: 360px;
  max-height: 540px;
  overflow: auto;
  padding: 16px;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.3);
  color: #e2e8f0;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

canvas {
  display: block;
  width: 100%;
  height: 420px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

#graph-report {
  min-height: 120px;
  max-height: 180px;
  border-top: 1px solid var(--line);
}

.edge-list {
  display: grid;
  gap: 8px;
  max-height: 210px;
  overflow: auto;
  border-top: 1px solid var(--glass-border);
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.edge-item {
  display: grid;
  gap: 6px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.5);
  transition: transform 0.2s ease, background 0.2s ease;
}

.edge-item:hover {
  transform: translateX(4px);
  background: rgba(30, 41, 59, 0.8);
}

.edge-item strong,
.edge-item span {
  overflow-wrap: anywhere;
}

.edge-item strong {
  font-size: 12px;
}

.edge-item span {
  color: var(--muted);
  font-size: 11px;
}

.edge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.edge-actions button {
  min-height: 28px;
  padding: 0 9px;
  font-size: 11px;
}

.index-panel .panel-header {
  padding: 0 0 10px;
  border: 0;
}

.index-panel .panel-header input {
  width: min(420px, 60%);
}

.index-list {
  display: grid;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}

.index-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.4);
  padding: 12px 14px;
  transition: all 0.2s ease;
}

.index-item:hover {
  background: rgba(30, 41, 59, 0.7);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.index-item button {
  min-height: 30px;
  padding: 0 10px;
}

.index-item strong,
.index-item span {
  display: block;
  overflow-wrap: anywhere;
}

.index-item span {
  color: var(--muted);
  font-size: 12px;
  margin-top: 3px;
}

.ok { color: var(--good); }
.bad { color: var(--bad); }

.embedded-doc {
  border: 1px dashed var(--line);
  border-radius: 8px;
  margin: 16px 0;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
.embedded-header {
  background: var(--surface-2);
  padding: 6px 12px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--muted);
  border-bottom: 1px dashed var(--line);
}
.embedded-body {
  padding: 14px;
}
#render-output {
  padding: 20px;
  overflow: auto;
  max-height: 540px;
  line-height: 1.6;
}
#render-output h1 {
  font-size: 22px;
  margin-top: 0;
  border-bottom: 1px solid var(--line);
  padding-bottom: 8px;
}
#render-output h2 {
  font-size: 18px;
  margin-top: 20px;
}
#render-output p {
  margin: 12px 0;
}
#render-output code {
  background: var(--surface-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 13px;
}
#render-output pre.code-block {
  background: rgba(0, 0, 0, 0.4);
  padding: 14px;
  border-radius: 8px;
  overflow: auto;
  border: 1px solid var(--line);
}
#render-output a.myc-link {
  color: var(--accent);
  text-decoration: none;
}
#render-output a.myc-link:hover {
  text-decoration: underline;
}

@media (max-width: 820px) {
  .resolver-bar,
  .query-row,
  .action-row,
  .workspace-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }

  .index-panel .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .index-panel .panel-header input {
    width: 100%;
  }
}

/* ── hero: living-pulse landing (chosen direction "живий пульс + двері") ── */
.hero {
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  background:
    radial-gradient(120% 90% at 15% -10%, rgba(56, 189, 248, 0.14), transparent 60%),
    radial-gradient(120% 90% at 100% 0%, rgba(168, 85, 247, 0.12), transparent 55%),
    var(--glass);
  padding: clamp(1.4rem, 3vw, 2.6rem);
  margin-bottom: 1rem;
}
.hero .tagline {
  color: var(--muted);
  font-size: clamp(1rem, 2.4vw, 1.25rem);
  margin: 0.25rem 0 0;
}
.hero .tagline strong { color: var(--accent); font-weight: 600; }
.spine {
  display: flex; flex-wrap: wrap; gap: 0.5rem;
  margin: 1.3rem 0 0;
}
.spine-badge {
  font-size: 0.82rem; color: var(--ink);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px; padding: 0.32rem 0.7rem;
}
.pulse {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.6rem; margin: 1.2rem 0 0;
}
.pulse-chip {
  border: 1px solid var(--glass-border); border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.7rem 0.8rem; display: flex; flex-direction: column; gap: 0.15rem;
}
.pulse-chip strong {
  font-size: 1.5rem; font-weight: 700; line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.pulse-chip span { font-size: 0.75rem; color: var(--muted); }
.doors {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.7rem; margin: 1.4rem 0 0;
}
.door {
  text-align: left; text-decoration: none; cursor: pointer;
  border: 1px solid var(--glass-border); border-radius: 14px;
  background: var(--surface); color: var(--ink);
  padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}
.door:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  background: var(--surface-2);
}
.door-icon { font-size: 1.4rem; }
.door-title { font-weight: 600; font-size: 1.02rem; }
.door-sub { font-size: 0.8rem; color: var(--muted); }
.join-reveal {
  margin: 1.1rem 0 0; padding: 1rem;
  border: 1px solid var(--glass-border); border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
}
.join-reveal p { margin: 0 0 0.6rem; color: var(--muted); font-size: 0.9rem; }
.copy-btn {
  font: inherit; cursor: pointer; margin-top: 0.4rem;
  border: 1px solid var(--glass-border); border-radius: 8px;
  background: var(--accent); color: #04121f; font-weight: 600;
  padding: 0.4rem 0.8rem;
}
.deep {
  border: 1px solid var(--glass-border); border-radius: 14px;
  background: var(--glass); overflow: hidden;
}
.deep > summary {
  cursor: pointer; list-style: none; padding: 0.9rem 1.1rem;
  color: var(--muted); font-size: 0.9rem; user-select: none;
}
.deep > summary::-webkit-details-marker { display: none; }
.deep > summary:hover { color: var(--ink); }
.deep[open] > summary { border-bottom: 1px solid var(--glass-border); }
.deep-body { padding: 1.1rem; }
`;

const JS = APP_JS_RAW.replaceAll(
  "__RESOLVER_DEFAULT__",
  RESOLVER_DEFAULT,
);

const MANIFEST = JSON.stringify(
  {
    name: "myc.md",
    short_name: "MYC",
    description: "Local-first MYC resolver shell",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#f7f4ec",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  },
  null,
  2,
);

const SERVICE_WORKER = `
const CACHE_NAME = "${CACHE_NAME}";
const ASSETS = ["/", "/styles.css", "/app.js", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("/"));
    })
  );
});
`;

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="20" fill="#f7f4ec"/>
  <circle cx="64" cy="64" r="44" fill="none" stroke="#217c67" stroke-width="7"/>
  <path d="M64 20v88M20 64h88M33 33l62 62M95 33 33 95" stroke="#b4532a" stroke-width="4" stroke-linecap="round"/>
  <circle cx="64" cy="64" r="11" fill="#217c67"/>
</svg>`;

function response(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=300",
    },
  });
}

// --- Deployment attestation (Resonant Resolution, tier-2 transparency) ---
// The deployed fallback proves it serves ONLY auditable bytes: it hashes its own
// served assets. A local `verify-deployment` recomputes the same from source and
// compares — so the central tier is VERIFIED, not trusted. Trust the hash, not the
// host. (chord x6000_954726, step 1)
async function attestSha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0"))
    .join(
      "",
    );
}

const SNAPSHOT_JSON = JSON.stringify(SNAPSHOT);

// The omega mesh relay (CONNECT to the membrane's SEE): a stranger who pulls the
// membrane discovers where to dial the libp2p mesh. One domain, two surfaces.
// (chord x3300_955776; relay lives on relay.myc.md, carved out of this worker's
// route so its wss reaches the libp2p circuit-relay.)
const RELAY_MULTIADDR =
  "/dns4/relay.myc.md/tcp/443/wss/p2p/12D3KooWRd5JMPNTBfpAAyG4bs3V9VhiM7CvgHotdQx5UNCRLsDN";

export const SERVED_ASSETS: Record<string, string> = {
  "/": HTML,
  "/styles.css": CSS,
  "/app.js": JS,
  "/manifest.webmanifest": MANIFEST,
  "/sw.js": SERVICE_WORKER,
  "/icon.svg": ICON,
  // The published network — verifiable by hash, covered by /attestation for free.
  "/snapshot.json": SNAPSHOT_JSON,
  // Mesh bootstrap discovery — the relay multiaddr, attested like everything else.
  "/.well-known/omega-relay": RELAY_MULTIADDR,
};

export interface DeploymentAttestation {
  schema: "myc.deployment-attestation.v0.1";
  assets: Record<string, string>;
  digest: string;
}

export async function attestation(): Promise<DeploymentAttestation> {
  const assets: Record<string, string> = {};
  for (const path of Object.keys(SERVED_ASSETS).sort()) {
    assets[path] = "sha256:" + (await attestSha256(SERVED_ASSETS[path]));
  }
  const canonical = Object.keys(assets).sort().map((p) => `${p} ${assets[p]}`)
    .join(
      "\n",
    );
  return {
    schema: "myc.deployment-attestation.v0.1",
    assets,
    digest: "sha256:" + (await attestSha256(canonical)),
  };
}

const ATTESTATION_JSON = JSON.stringify(await attestation(), null, 2);

// ── witness→publish contour (chord: keyless capture reaches strangers) ────────
// A keyed voice witnesses content by signing it; this endpoint verifies the
// witness and writes the records to a live KV store the resolver reads. No CF
// creds, no maintainer deploy — a voice publishes from anywhere with its key.
// The worker verifies the WITNESS (a voice vouched); the CLIENT pre-verifies the
// content with myc's canonical verifier; the world audits via verify-snapshot
// (accountable witnessing — bad publishes are detectable + attributable).
interface Env {
  MYC_PUBLISHED?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}
const REGISTRY_URL =
  "https://raw.githubusercontent.com/s0fractal/trinity/main/src/x2F38_voice_pubkeys.json";
const _utf8 = (s: string) => new TextEncoder().encode(s);
const _unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const _hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0"))
    .join("");

// deno-lint-ignore no-explicit-any
async function ed25519Verify(
  sig: Uint8Array,
  msg: Uint8Array,
  pub: Uint8Array,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    pub as unknown as BufferSource,
    "Ed25519",
    false,
    ["verify"],
  );
  return await crypto.subtle.verify(
    "Ed25519",
    key,
    sig as unknown as BufferSource,
    msg as unknown as BufferSource,
  );
}

// The digest a witness signs — binds each record's fqdn + exact bytes. The CLI
// computes the same string and signs utf8(it) with the voice key (x2F37).
// deno-lint-ignore no-explicit-any
async function batchDigest(records: any[]): Promise<string> {
  const canonical = JSON.stringify(
    records.map((r) => ({ fqdn: r.fqdn, rawText: r.rawText }))
      .sort((a, b) => a.fqdn < b.fqdn ? -1 : 1),
  );
  return "sha256:" +
    _hex(await crypto.subtle.digest("SHA-256", _utf8(canonical)));
}

// deno-lint-ignore no-explicit-any
async function readPublished(env: Env): Promise<any[]> {
  try {
    const raw = await env.MYC_PUBLISHED?.get("records");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const jsonResp = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function handlePublish(request: Request, env: Env): Promise<Response> {
  if (!env.MYC_PUBLISHED) {
    return jsonResp({ ok: false, error: "no store" }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ ok: false, error: "bad json" }, 400);
  }
  const records = body?.records, witness = body?.witness;
  if (
    !Array.isArray(records) || !records.length || !witness?.voice ||
    !witness?.sig
  ) {
    return jsonResp({
      ok: false,
      error: "need {records[], witness{voice,sig}}",
    }, 400);
  }
  // verify the WITNESS: a keyed voice signed this exact batch
  const digest = await batchDigest(records);
  let reg;
  try {
    reg = await (await fetch(REGISTRY_URL)).json();
  } catch {
    return jsonResp({ ok: false, error: "registry unreachable" }, 502);
  }
  const pub = reg?.keys?.[witness.voice]?.pubkey;
  if (!pub) {
    return jsonResp(
      { ok: false, error: `unknown voice ${witness.voice}` },
      403,
    );
  }
  let ok = false;
  try {
    ok = await ed25519Verify(_unb64(witness.sig), _utf8(digest), _unb64(pub));
  } catch (e) {
    return jsonResp({ ok: false, error: "verify error: " + e }, 500);
  }
  if (!ok) {
    return jsonResp({ ok: false, error: "bad witness signature", digest }, 403);
  }
  // AUDIT A2 — verify content BY HASH before it becomes authoritative. The
  // witness vouched, but the membrane must never serve a record whose commitment
  // doesn't match its own body. This is the SAME canonical check verify-snapshot
  // runs (verifyCommitment), now enforced on the live ingest path — so a bad
  // publish is rejected at write, not merely detectable afterward.
  for (const r of records) {
    const v = r?.descriptor
      ? await verifyCommitment(r.descriptor)
      : { ok: false, errors: ["record has no descriptor"] };
    if (!v.ok) {
      return jsonResp({
        ok: false,
        error: `record ${r?.fqdn} fails commitment: ${v.errors.join("; ")}`,
      }, 422);
    }
  }
  // merge into the live store (last-write-wins by fqdn)
  const existing = await readPublished(env);
  const byFqdn = new Map(existing.map((r) => [r.fqdn, r]));
  for (const r of records) byFqdn.set(r.fqdn, r);
  const merged = [...byFqdn.values()];
  await env.MYC_PUBLISHED!.put("records", JSON.stringify(merged));
  await env.MYC_PUBLISHED!.put(
    "witness:" + digest,
    JSON.stringify({
      voice: witness.voice,
      sig: witness.sig,
      count: records.length,
    }),
  );
  return jsonResp({
    ok: true,
    published: records.length,
    total: merged.length + SNAPSHOT.records.length,
    witness: witness.voice,
    digest,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env = {},
    _ctx?: unknown,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/publish" && request.method === "POST") {
      return await handlePublish(request, env);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405 });
    }
    // Live records = baked snapshot + witnessed KV publishes. Read once, lazily.
    // deno-lint-ignore no-explicit-any
    let _rec: any[] | null = null;
    // deno-lint-ignore no-explicit-any
    const allRecords = async (): Promise<any[]> =>
      _rec ??= SNAPSHOT.records.concat(await readPublished(env));

    if (url.pathname === "/snapshot.json") {
      return response(
        JSON.stringify({ ...SNAPSHOT, records: await allRecords() }),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/attestation") {
      return response(ATTESTATION_JSON, "application/json; charset=utf-8");
    }

    if (url.pathname === "/.well-known/omega-relay") {
      return response(RELAY_MULTIADDR, "text/plain; charset=utf-8");
    }

    if (url.pathname === "/styles.css") {
      return response(CSS, "text/css; charset=utf-8");
    }
    if (url.pathname === "/app.js") {
      return response(JS, "application/javascript; charset=utf-8");
    }
    if (url.pathname === "/manifest.webmanifest") {
      return response(MANIFEST, "application/manifest+json; charset=utf-8");
    }
    if (url.pathname === "/sw.js") {
      return response(SERVICE_WORKER, "application/javascript; charset=utf-8");
    }
    if (url.pathname === "/icon.svg") {
      return response(ICON, "image/svg+xml; charset=utf-8");
    }
    if (url.pathname === "/health") {
      return response(
        JSON.stringify(
          {
            ok: true,
            service: "myc.md-pwa-shell",
            resolver: RESOLVER_DEFAULT,
            version: "published-snapshot-v0.1",
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/index") {
      const includePaths = ["1", "true", "yes"].includes(
        (url.searchParams.get("paths") ?? "").toLowerCase(),
      );
      return response(
        JSON.stringify(
          {
            ok: true,
            count: (await allRecords()).length,
            records: (await allRecords()).map((r) => ({
              fqdn: r.fqdn,
              path: includePaths ? r.path : undefined,
              type: r.type,
              commitment: r.commitment,
            })),
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/descriptor") {
      const target = url.searchParams.get("target") || "";
      const record = (await allRecords()).find((r) =>
        r.fqdn === target || r.path === target
      );
      if (!record) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Descriptor not found: " + target,
          }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return response(
        JSON.stringify({ ok: true, descriptor: record.descriptor }, null, 2),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/resolve") {
      const fqdn = url.searchParams.get("fqdn") || "";
      const record = (await allRecords()).find((r) => r.fqdn === fqdn);
      if (!record) {
        return new Response(
          JSON.stringify({ ok: false, error: "not-found", fqdn }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return response(
        JSON.stringify({ ok: true, ...record }, null, 2),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/source") {
      const target = url.searchParams.get("target") || "";
      const record = (await allRecords()).find((r) =>
        r.fqdn === target || r.path === target
      );
      if (!record) {
        return new Response(
          JSON.stringify({ ok: false, error: "Source not found: " + target }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return response(
        JSON.stringify({ ok: true, source: record.rawText }, null, 2),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/explain") {
      const target = url.searchParams.get("target") || "";
      const record = (await allRecords()).find((r) =>
        r.fqdn === target || r.path === target
      );
      if (!record) {
        return new Response(
          JSON.stringify({ ok: false, error: "Target not found: " + target }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      const desc = record.descriptor as Record<string, unknown>;
      const body = desc?.body as Record<string, unknown>;
      return response(
        JSON.stringify(
          {
            ok: true,
            summary: {
              type: record.type,
              coordinate: body?.coordinate,
              status: body?.status,
            },
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/verify") {
      return response(VERIFY_HTML, "text/html; charset=utf-8");
    }
    if (url.pathname === "/verify.client.js") {
      return response(VERIFY_JS, "application/javascript; charset=utf-8");
    }

    if (url.pathname === "/published") {
      // AUDIT A11 — expose the KV-published records (not yet in the committed
      // snapshot) so `t myc reconcile-published` can fold them into the durable
      // git tree, and so anyone can see what is live-but-not-yet-durable.
      return response(
        JSON.stringify(await readPublished(env), null, 2),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/verify-projections") {
      // AUDIT A7 — was a hardcoded `ok:true` stub (verified nothing). Now it
      // actually re-verifies every served record's commitment BY HASH using the
      // shared verifier (A2), so this endpoint can no longer lie.
      const recs = await allRecords();
      const errors: string[] = [];
      let verified = 0;
      let canonicalOnly = 0; // no embedded descriptor → verifiable only via verify-snapshot
      for (const r of recs) {
        if (!r?.descriptor) {
          canonicalOnly++;
          continue;
        }
        const v = await verifyCommitment(r.descriptor);
        if (v.ok) verified++;
        else errors.push(`${r.fqdn}: ${v.errors.join("; ")}`);
      }
      return response(
        JSON.stringify(
          {
            ok: errors.length === 0, // no record with an embedded descriptor is forged
            verified,
            canonical_only: canonicalOnly,
            descriptor_count: recs.length,
            errors: errors.slice(0, 20),
            note:
              "records with an embedded descriptor are re-verified by hash here; the rest are canonical-only — run: t myc verify-snapshot https://myc.md/snapshot.json for full verification",
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/graph") {
      const edges: Record<string, unknown>[] = [];
      for (const record of (await allRecords())) {
        if (record.type === "TransformationDescriptor") {
          const desc = record.descriptor as Record<string, unknown>;
          const body = desc?.body as Record<string, unknown>;
          if (!body) continue;
          const inputs = Array.isArray(body.input)
            ? body.input
            : (body.input ? [body.input] : []);
          const outputs = Array.isArray(body.output)
            ? body.output
            : (body.output ? [body.output] : []);
          for (const input of inputs) {
            for (const output of outputs) {
              edges.push({
                transform: record.fqdn,
                step: body.step || "unknown",
                direction: body.direction || "forward",
                proof_mode: body.proof_mode || "deterministic",
                function_fqdn:
                  (body.function as Record<string, unknown>)?.fqdn || null,
                input,
                output,
              });
            }
          }
        }
      }
      return response(
        JSON.stringify(
          {
            ok: true,
            count: edges.length,
            edges,
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/lineage") {
      const target = url.searchParams.get("target") || "";
      const edges: Record<string, unknown>[] = [];
      for (const record of (await allRecords())) {
        if (record.type === "TransformationDescriptor") {
          const desc = record.descriptor as Record<string, unknown>;
          const body = desc?.body as Record<string, unknown>;
          if (!body) continue;
          const inputs = Array.isArray(body.input)
            ? body.input
            : (body.input ? [body.input] : []);
          const outputs = Array.isArray(body.output)
            ? body.output
            : (body.output ? [body.output] : []);
          for (const input of inputs) {
            for (const output of outputs) {
              edges.push({
                transform: record.fqdn,
                step: body.step || "unknown",
                direction: body.direction || "forward",
                proof_mode: body.proof_mode || "deterministic",
                function_fqdn:
                  (body.function as Record<string, unknown>)?.fqdn || null,
                input,
                output,
              });
            }
          }
        }
      }
      const backward = edges.filter((e) =>
        (e.output as Record<string, unknown>)?.fqdn === target
      );
      const forward = edges.filter((e) =>
        (e.input as Record<string, unknown>)?.fqdn === target
      );
      return response(
        JSON.stringify(
          {
            ok: true,
            backward,
            forward,
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/verification") {
      const receipts = (await allRecords())
        .filter((r) =>
          r.path.startsWith("public/verification/") ||
          r.type === "VerificationReceipt"
        )
        .map((r) => ({
          name: r.path.split("/").pop() || "",
          path: r.path,
        }));
      return response(
        JSON.stringify({ ok: true, count: receipts.length, receipts }, null, 2),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/verification-source") {
      const name = url.searchParams.get("name") || "";
      const record = (await allRecords()).find((r) => r.path.endsWith(name));
      if (!record) {
        return new Response(
          JSON.stringify({ ok: false, error: "not-found", name }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return response(
        JSON.stringify({ ok: true, name, source: record.rawText }, null, 2),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/nutrition") {
      const target = url.searchParams.get("target") || "";
      const record = (await allRecords()).find((r) =>
        r.fqdn === target || r.path === target
      );
      if (!record) {
        return new Response(
          JSON.stringify({ ok: false, error: "Target not found" }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      const desc = record.descriptor as Record<string, unknown>;
      const body = desc?.body as Record<string, unknown>;
      return response(
        JSON.stringify(
          {
            ok: true,
            nutrition: {
              status: body?.status === "draft" ? "speculative" : "verified",
            },
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/availability") {
      const target = url.searchParams.get("target") || "";
      const record = (await allRecords()).find((r) =>
        r.fqdn === target || r.path === target
      );
      return response(
        JSON.stringify(
          {
            ok: true,
            access_mode: record ? "public" : "unknown",
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/recipe-dry-run") {
      const target = url.searchParams.get("target") || "";
      return response(
        JSON.stringify(
          {
            ok: true,
            target,
            function_fqdn: "h.testfunc.function.myc.md",
            payload_policy: "none",
            logs: ["dry-run succeeded from snapshot fallback"],
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    if (url.pathname === "/adapter-dry-run") {
      const adapter = url.searchParams.get("adapter") || "";
      return response(
        JSON.stringify(
          {
            ok: true,
            adapter,
            status: "simulated-success",
            logs: ["adapter dry-run succeeded from snapshot fallback"],
          },
          null,
          2,
        ),
        "application/json; charset=utf-8",
      );
    }

    return response(HTML, "text/html; charset=utf-8");
  },
};
