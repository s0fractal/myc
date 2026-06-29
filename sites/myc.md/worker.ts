// The published network snapshot, bundled so the deployed myc.md can SERVE the
// content-addressed network (the tier-2 fallback). Regenerated at deploy
// (`deno task site:deploy`); a stranger can pull + verify it by hash:
//   t myc import-snapshot https://myc.md/snapshot.json --write
import SNAPSHOT from "./snapshot.gen.json" with { type: "json" };

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
    <section class="topology" aria-label="MYC resolver">
      <div class="brand-row">
        <div class="mark" aria-hidden="true"></div>
        <div>
          <h1>myc.md</h1>
          <p>local-first resolver shell</p>
        </div>
      </div>

      <section class="join" aria-label="Join the mycelium">
        <p>
          This page is a thin UI. The substrate is an <strong>organism you run
          locally</strong>, not a hosted service. To join the mycelium, clone it:
        </p>
        <pre class="join-cmd"><code>curl -fsSL https://raw.githubusercontent.com/s0fractal/trinity/main/install.sh | sh</code></pre>
        <p class="join-note">
          Clones <a href="https://github.com/s0fractal/trinity">trinity</a> (the
          organism) to <code>~/trinity</code> and the public organ
          <a href="https://github.com/s0fractal/myc">myc</a>; the private organs
          (omega, liquid) stay present by reference. Then:
          <code>cd ~/trinity &amp;&amp; ./t self</code>.
        </p>
        <p class="join-note">
          You're a participant, not a spectator. Contribute a thought with no key:
          <code>./t myc propose --text "…" --requires trinity</code> records a
          content-addressed, dormant proposal. Reading is open; trust is
          <strong>earned through witnessing</strong>, not granted by a key.
        </p>
        <p class="join-note">
          Or just <a href="https://relay.myc.md/mesh/">browse the live mesh</a> —
          read signed chords and watch your own browser verify each Ed25519
          signature. No install, no account. Trust the hash, not the host.
        </p>
      </section>

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
    </section>

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
`;

const JS = `
const DEFAULT_RESOLVER = "${RESOLVER_DEFAULT}";
const $ = (id) => document.getElementById(id);

const state = {
  resolver: localStorage.getItem("myc.resolver") || DEFAULT_RESOLVER,
  records: [],
  deferredInstall: null,
  searchTimer: null,
  reconnectTimer: null,
  lastGraph: null,
  dirHandle: null,
};

$("resolver-url").value = state.resolver;
$("adapter-input").value = "genesis";

function setText(id, value, cls = "") {
  const el = $(id);
  el.textContent = value;
  el.className = cls;
}

function write(value) {
  $("output").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function readJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setConnection(message, status = "unknown") {
  const note = $("connection-note");
  note.classList.toggle("online", status === "online");
  note.classList.toggle("offline", status === "offline");
  $("connection-message").textContent = message;
}

function lastSeenText() {
  const value = localStorage.getItem("myc.lastSeen");
  if (!value) return "never";
  return new Date(value).toLocaleString();
}

function setTarget(target, updateUrl = true) {
  $("target-input").value = target;
  if (!updateUrl || !target) return;
  const nextPath = "/" + encodeURIComponent(target);
  if (location.pathname !== nextPath) {
    history.replaceState(null, "", nextPath);
  }
}

function resolverBase() {
  const value = $("resolver-url").value.trim().replace(/\/+$/, "");
  state.resolver = value || DEFAULT_RESOLVER;
  localStorage.setItem("myc.resolver", state.resolver);
  return state.resolver;
}

async function api(path) {
  if (state.dirHandle) {
    return await mockLocalApi(path);
  }
  const response = await fetch(resolverBase() + path, { method: "GET" });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { ok: false, raw: text };
  }
  if (!response.ok) {
    const error = new Error(body.error || response.statusText);
    error.body = body;
    throw error;
  }
  return body;
}

// The afferent passage: contribute a thought through the membrane, keyless.
// Writes a dormant, content-addressed proposal via the local resolver's POST
// /propose. Carries no trust until a voice witnesses it.
async function contribute() {
  if (state.dirHandle) {
    write(
      "Contributing writes through a local resolver. Use Connect (not Open " +
        "Directory) so the proposal is content-addressed and indexed.",
    );
    return;
  }
  const proposal = $("contribute-text").value.trim();
  if (!proposal) {
    write("Write a thought to contribute first.");
    return;
  }
  const requires = $("contribute-requires").value;
  const proposer = ($("contribute-proposer").value || "").trim() || "anon";
  const response = await fetch(resolverBase() + "/propose", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proposal, requires, proposer }),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { ok: false, raw: text };
  }
  if (!response.ok || !body.ok) {
    write("Contribution failed: " + (body.error || response.statusText));
    return;
  }
  $("contribute-text").value = "";
  write(
    "✓ Contributed (keyless, dormant) — " + body.fqdn + "\n\n" +
      JSON.stringify(body, null, 2) +
      "\n\nIt carries no trust until a voice witnesses it. Load Index to see it.",
  );
  loadIndex().catch(() => {});
}

// --- Browser Local File System Mode Support ---

async function selectDirectory() {
  try {
    state.dirHandle = await window.showDirectoryPicker();
    localStorage.setItem("myc.useLocalDir", "true");
    setConnection("online | local directory: " + state.dirHandle.name, "online");
    setText("health-value", "local-fs", "ok");
    setText("version-value", "browser-direct");
    await scanLocalDir();
    await verifyGraph();
    await loadIndex();
    write("Successfully connected to local directory: " + state.dirHandle.name);
  } catch (e) {
    write("Failed to open local directory: " + e.message);
  }
}

async function walkDirHandle(dirHandle, pathParts = []) {
  const files = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "directory") {
      if ([".git", "node_modules", ".wrangler", "dist"].includes(entry.name)) continue;
      const subFiles = await walkDirHandle(entry, [...pathParts, entry.name]);
      files.push(...subFiles);
    } else if (entry.kind === "file" && (entry.name.endsWith(".md") || entry.name.endsWith(".myc.md"))) {
      files.push({
        handle: entry,
        name: entry.name,
        relativePath: [...pathParts, entry.name].join("/"),
      });
    }
  }
  return files;
}

function parseFrontmatterJS(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const obj = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentList = null;

  for (const line of lines) {
    if (line.trim().startsWith("#") || !line.trim()) continue;

    const listItemMatch = line.match(/^\s*-\s*(.*)$/);
    if (listItemMatch && currentKey) {
      if (!currentList) {
        currentList = [];
        obj[currentKey] = currentList;
      }
      let val = listItemMatch[1].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      currentList.push(val);
      continue;
    }

    const keyValueMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (keyValueMatch) {
      currentKey = keyValueMatch[1].trim();
      currentList = null;
      let val = keyValueMatch[2].trim();
      if (val === "") continue;
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      
      if (val === "true") obj[currentKey] = true;
      else if (val === "false") obj[currentKey] = false;
      else if (val === "null") obj[currentKey] = null;
      else if (!isNaN(Number(val)) && val !== "") obj[currentKey] = Number(val);
      else obj[currentKey] = val;
    }
  }
  return obj;
}

async function fileToDescriptorRecord(fileEntry) {
  const file = await fileEntry.handle.getFile();
  const text = await file.text();

  const jsonMatch = text.match(/\`\`\`json myc\n([\s\S]*?)\n\`\`\`/);
  if (jsonMatch) {
    try {
      const descriptor = JSON.parse(jsonMatch[1]);
      return {
        fqdn: descriptor.fqdn,
        path: fileEntry.relativePath,
        type: descriptor.type,
        commitment: descriptor.commitment.value,
        descriptor,
        rawText: text,
      };
    } catch (e) {}
  }

  const fm = parseFrontmatterJS(text);
  const filename = fileEntry.name;
  const hasCoordinate = fm.coordinate || /^x[0-9a-fA-F]{4}/.test(filename);
  const isMycMd = filename.endsWith(".myc.md") || filename.endsWith(".md");

  if (hasCoordinate && isMycMd) {
    const coordMatch = filename.match(/^(x[0-9a-fA-F]{4})/);
    const coordinate = fm.coordinate || (coordMatch ? coordMatch[1] : "x0000");
    const type = fm.type || "VectorDocumentDescriptor";
    const fqdn = fm.fqdn || filename;

    const descriptorBody = {
      coordinate,
      type,
      status: fm.status || "draft",
      ...fm,
    };

    // Canonical commitment — protocols/x0000_spec_provenance.myc.md §2. Bind the
    // NAME (fqdn) AND the CONTENT (body after frontmatter, trailing ws stripped),
    // so neither payload tampering nor coordinate-spoofing can pass. This must
    // match the CLI resolver (src/x0200_resolve.ts canonicalCommitment); the
    // conformance vector x0000_conformance.myc.md hashes to
    // 0cd0ac37654f234bde63ddb72ca3ff3920ed0fa5d2602d07221528b7b2a0d875.
    const fmMatch = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
    const contentBody = fmMatch ? fmMatch[1] : text;

    const encoder = new TextEncoder();
    const data = encoder.encode(fqdn + "\n" + contentBody.trimEnd());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const descriptor = {
      type,
      schema_version: fm.schema_version || "myc.vector-document.v0.1",
      fqdn,
      commitment: {
        algorithm: "sha256",
        value: hashHex,
        covers: "fqdn + body",
      },
      body: descriptorBody,
    };

    return {
      fqdn,
      path: fileEntry.relativePath,
      type,
      commitment: hashHex,
      descriptor,
      rawText: text,
    };
  }

  return null;
}

async function scanLocalDir() {
  if (!state.dirHandle) return;
  const files = await walkDirHandle(state.dirHandle);
  const records = [];
  for (const fileEntry of files) {
    try {
      const record = await fileToDescriptorRecord(fileEntry);
      if (record) records.push(record);
    } catch (e) {
      console.warn("Failed to parse local file: " + fileEntry.relativePath, e);
    }
  }
  state.records = records;
}

async function mockLocalApi(path) {
  const url = new URL(path, "http://local-mock");
  const endpoint = url.pathname;

  if (state.records.length === 0 || endpoint === "/index" || endpoint === "/verify-projections") {
    await scanLocalDir();
  }

  if (endpoint === "/health") {
    return {
      ok: true,
      service: "myc.md-pwa-local-fs",
      resolver: "Browser FileSystem API",
      version: "browser-direct-v0.1",
    };
  }

  if (endpoint === "/index") {
    return {
      ok: true,
      count: state.records.length,
      records: state.records.map((r) => ({
        fqdn: r.fqdn,
        path: r.path,
        type: r.type,
        commitment: r.commitment,
      })),
    };
  }

  if (endpoint === "/search") {
    const q = url.searchParams.get("q") || "";
    const results = state.records.filter((r) =>
      r.fqdn.toLowerCase().includes(q.toLowerCase()) ||
      r.type.toLowerCase().includes(q.toLowerCase())
    );
    return {
      ok: true,
      count: results.length,
      results: results.map((r) => ({
        fqdn: r.fqdn,
        path: r.path,
        type: r.type,
        commitment: r.commitment,
      })),
    };
  }

  if (endpoint === "/descriptor") {
    const target = url.searchParams.get("target") || "";
    const record = state.records.find((r) => r.fqdn === target || r.path === target);
    if (!record) throw new Error("Descriptor not found: " + target);
    return {
      ok: true,
      descriptor: record.descriptor,
    };
  }

  if (endpoint === "/source") {
    const target = url.searchParams.get("target") || "";
    const record = state.records.find((r) => r.fqdn === target || r.path === target);
    if (!record) throw new Error("Source not found: " + target);
    return {
      ok: true,
      source: record.rawText,
    };
  }

  if (endpoint === "/explain") {
    const target = url.searchParams.get("target") || "";
    const record = state.records.find((r) => r.fqdn === target || r.path === target);
    if (!record) throw new Error("Target not found: " + target);
    return {
      ok: true,
      summary: {
        type: record.type,
        coordinate: record.descriptor.body.coordinate,
        status: record.descriptor.body.status,
      },
    };
  }

  if (endpoint === "/verify-projections") {
    return {
      ok: true,
      index_synced: true,
      graph_synced: true,
      descriptor_count: state.records.length,
      index_record_count: state.records.length,
      errors: [],
      warnings: [],
    };
  }

  if (endpoint === "/graph") {
    const edges = [];
    for (const record of state.records) {
      if (record.type === "TransformationDescriptor") {
        const body = record.descriptor.body;
        const inputs = Array.isArray(body.input) ? body.input : (body.input ? [body.input] : []);
        const outputs = Array.isArray(body.output) ? body.output : (body.output ? [body.output] : []);
        for (const input of inputs) {
          for (const output of outputs) {
            edges.push({
              transform: record.fqdn,
              step: body.step || "unknown",
              direction: body.direction || "forward",
              proof_mode: body.proof_mode || "deterministic",
              function_fqdn: body.function?.fqdn || null,
              input,
              output,
            });
          }
        }
      }
    }
    return {
      ok: true,
      count: edges.length,
      edges,
    };
  }

  if (endpoint === "/lineage") {
    const target = url.searchParams.get("target") || "";
    const graphData = await mockLocalApi("/graph");
    const edges = graphData.edges;
    const backward = edges.filter((e) => e.output?.fqdn === target);
    const forward = edges.filter((e) => e.input?.fqdn === target);
    return {
      ok: true,
      backward,
      forward,
    };
  }

  if (endpoint === "/nutrition") {
    const target = url.searchParams.get("target") || "";
    const record = state.records.find((r) => r.fqdn === target || r.path === target);
    if (!record) throw new Error("Target not found");
    return {
      ok: true,
      nutrition: {
        status: record.descriptor.body.status === "draft" ? "speculative" : "verified",
      },
    };
  }

  if (endpoint === "/availability") {
    const target = url.searchParams.get("target") || "";
    const record = state.records.find((r) => r.fqdn === target || r.path === target);
    return {
      ok: true,
      access_mode: record ? "public" : "unknown",
    };
  }

  throw new Error("Local mock not implemented for: " + endpoint);
}

// --- Dynamic Rendering & Lens Overrides ---

function renderMarkdown(text) {
  let body = text.replace(/^---[\s\S]*?---\r?\n/, "");
  
  body = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  body = body.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  body = body.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  body = body.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  body = body.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  
  body = body.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  body = body.replace(/\*(.*?)\*/g, "<em>$1</em>");
  
  body = body.replace(/\`\`\`(.*?)\n([\s\S]*?)\`\`\`/g, "<pre class='code-block'><code class='language-$1'>$2</code></pre>");
  body = body.replace(/\`(.*?)\`/g, "<code>$1</code>");
  
  body = body.replace(/\s*\[(.*?)\]\((.*?)\)/g, " <a href='$2' class='myc-link'>$1</a>");
  body = body.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' class='myc-link'>$1</a>");
  body = body.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>");
  
  const blocks = body.split(/\n\n+/);
  body = blocks.map(block => {
    block = block.trim();
    if (block.startsWith("<h") || block.startsWith("<li") || block.startsWith("<pre") || block.startsWith("<ul") || block.startsWith("<ol") || block.startsWith("<div")) {
      return block;
    }
    if (block.startsWith("<li>")) {
      return "<ul>" + block + "</ul>";
    }
    return "<p>" + block.replace(/\n/g, "<br>") + "</p>";
  }).join("\n");
  
  return body;
}

async function renderDocument(target, depth = 0) {
  if (depth > 5) return "<p class='bad'>Error: Maximum transclusion depth exceeded.</p>";
  
  try {
    const res = await api("/source?target=" + encodeURIComponent(target));
    let source = res.source;
    if (!source) return "<p class='bad'>Source empty or unavailable.</p>";
    
    const fm = parseFrontmatterJS(source);
    
    // Match transclusions: ![alt](xNNNN_other.myc.md)
    const embedRegex = /!\[(.*?)\]\(((?:x[0-9a-fA-F]{4}[^\)]*?\.(?:myc\.)?md))\)/g;
    let match;
    const embeds = [];
    while ((match = embedRegex.exec(source)) !== null) {
      embeds.push({
        full: match[0],
        alt: match[1],
        targetFqdn: match[2],
      });
    }
    
    for (const embed of embeds) {
      const embeddedHtml = await renderDocument(embed.targetFqdn, depth + 1);
      source = source.replace(embed.full, \`<div class="embedded-doc" data-fqdn="\${embed.targetFqdn}">
        <div class="embedded-header">\${embed.targetFqdn}</div>
        <div class="embedded-body">\${embeddedHtml}</div>
      </div>\`);
    }
    
    let html = renderMarkdown(source);
    
    const customStyle = fm.lens || fm.style;
    if (customStyle && depth === 0) {
      try {
        const styleRes = await api("/source?target=" + encodeURIComponent(customStyle));
        const styleText = styleRes.source;
        if (styleText) {
          let css = styleText;
          const cssMatch = styleText.match(/\`\`\`css\n([\s\S]*?)\`\`\`/);
          if (cssMatch) css = cssMatch[1];
          html = \`<style id="lens-stylesheet">\${css}</style>\` + html;
        }
      } catch (e) {
        console.warn("Failed to load lens style: " + customStyle, e);
      }
    }
    
    return html;
  } catch (e) {
    return \`<p class='bad'>Failed to resolve transclusion: \${target}. Error: \${e.message}</p>\`;
  }
}

function initialTarget() {
  const host = location.hostname;
  if (host !== "myc.md" && !host.endsWith(".workers.dev")) return host;
  const path = decodeURIComponent(location.pathname.replace(/^\/+/, ""));
  return path && !["index.html", "manifest.webmanifest", "sw.js"].includes(path)
    ? path
    : "task.s0fractal.h.38bfd1d80cb9.myc.md";
}

async function connect() {
  setText("health-value", "checking");
  setConnection("checking local resolver");
  try {
    const health = await api("/health");
    setText("health-value", health.service || "ok", "ok");
    setText("version-value", health.version || "unknown");
    const now = new Date().toISOString();
    localStorage.setItem("myc.lastSeen", now);
    clearTimeout(state.reconnectTimer);
    setConnection("online | last seen " + new Date(now).toLocaleString(), "online");
    write(health);
    await verifyGraph();
  } catch (error) {
    setText("health-value", "offline", "bad");
    setText("version-value", "unknown", "bad");
    setText("graph-value", "unavailable", "bad");
    setConnection("offline | last seen " + lastSeenText(), "offline");
    restoreCachedLens();
    scheduleReconnect();
    write({
      ok: false,
      message: "Local resolver is not reachable. Run: cd ~/myc && deno task myc serve --port 8787",
      error: error.body || error.message,
    });
  }
}

async function verifyGraph() {
  const result = await api("/verify-projections");
  setText("graph-value", result.ok ? "ok" : "failed", result.ok ? "ok" : "bad");
  setText("descriptor-value", String(result.descriptor_count ?? 0));
  setText("edge-value", result.graph_synced ? "synced" : "stale", result.graph_synced ? "" : "bad");
  $("graph-title").textContent = result.ok ? "verified" : "needs attention";
  $("graph-report").textContent = JSON.stringify({
    ok: result.ok,
    index_synced: result.index_synced,
    graph_synced: result.graph_synced,
    descriptors: result.descriptor_count,
    index_records: result.index_record_count,
    errors: result.errors || [],
    warnings: result.warnings || [],
  }, null, 2);
  renderEdges([]);
  state.lastGraph = result;
  writeJson("myc.lastGraph", {
    ok: result.ok,
    descriptor_count: result.descriptor_count,
    index_record_count: result.index_record_count,
    index_synced: result.index_synced,
    graph_synced: result.graph_synced,
    errors: result.errors || [],
    warnings: result.warnings || [],
  });
  write(result);
  return result;
}

async function loadGraph() {
  const result = await api("/graph");
  $("graph-title").textContent = "graph snapshot";
  $("graph-report").textContent = JSON.stringify({
    ok: result.ok,
    edges: result.count,
  }, null, 2);
  drawGraph({ backward: result.edges || [], forward: [] });
  renderEdges(result.edges || []);
  writeJson("myc.lastGraphSnapshot", {
    count: result.count,
    edges: (result.edges || []).slice(0, 80),
  });
  write(result);
  return result;
}

async function loadIndex() {
  const result = await api("/index");
  state.records = result.records || [];
  setText("descriptor-value", String(result.count ?? state.records.length));
  writeJson("myc.lastIndex", {
    count: result.count ?? state.records.length,
    records: state.records.slice(0, 120),
  });
  renderIndex();
  write(result);
  return result;
}

async function loadVerification() {
  const result = await api("/verification");
  state.records = (result.receipts || []).map((receipt) => ({
    fqdn: receipt.path,
    type: "VerificationReceipt",
    commitment: receipt.name,
    receipt_name: receipt.name,
    receipt_path: receipt.path,
  }));
  setText("descriptor-value", String(result.count ?? state.records.length));
  renderIndex();
  $("descriptor-title").textContent = "verification receipts";
  write(result);
  switchTab("json");
  return result;
}

async function loadVerificationSource(name) {
  const result = await api("/verification-source?name=" + encodeURIComponent(name));
  $("descriptor-title").textContent = name;
  write(result.source || result);
  switchTab("json");
}

function switchTab(tab) {
  $("tab-json").classList.toggle("active", tab === "json");
  $("tab-render").classList.toggle("active", tab === "render");
  $("tab-availability").classList.toggle("active", tab === "availability");
  $("tab-summary").classList.toggle("active", tab === "summary");
  $("tab-source").classList.toggle("active", tab === "source");
  $("output").hidden = tab !== "json";
  $("render-output").hidden = tab !== "render";
  $("availability-output").hidden = tab !== "availability";
  $("summary-output").hidden = tab !== "summary";
  $("source-output").hidden = tab !== "source";
}

async function resolveTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  setTarget(target);
  const result = await api("/descriptor?target=" + encodeURIComponent(target));
  $("descriptor-title").textContent = result.descriptor?.type || target;

  const payloadState = result.descriptor?.body?.payload?.state || result.descriptor?.body?.payload_state || "public";
  const badge = $("privacy-badge");
  badge.textContent = payloadState;
  badge.className = "badge " + payloadState;
  badge.hidden = false;

  renderNutritionBadge(null);
  api("/nutrition?target=" + encodeURIComponent(target))
    .then((nutrition) => renderNutritionBadge(nutrition.nutrition))
    .catch(() => renderNutritionBadge(null));

  renderAvailabilityBadge(null);
  api("/availability?target=" + encodeURIComponent(target))
    .then((availability) => {
      renderAvailabilityBadge(availability);
      $("availability-output").textContent = JSON.stringify(availability, null, 2);
    })
    .catch((error) => {
      renderAvailabilityBadge(null);
      $("availability-output").textContent = "Access unavailable.\n\nReason: " + (error.body?.error || error.message);
    });

  write(result.descriptor || result);
  switchTab("json");
}

function renderNutritionBadge(nutrition) {
  const nutritionBadge = $("nutrition-badge");
  if (!nutrition?.status) {
    nutritionBadge.hidden = true;
    return;
  }
  nutritionBadge.textContent = nutrition.status;
  nutritionBadge.className = "badge " + nutrition.status;
  nutritionBadge.hidden = false;
}

function renderAvailabilityBadge(availability) {
  const badge = $("availability-badge");
  if (!availability?.access_mode) {
    badge.hidden = true;
    return;
  }
  badge.textContent = availability.access_mode;
  badge.className = "badge " + availability.access_mode;
  badge.hidden = false;
}

async function availabilityTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  $("availability-output").textContent = "Loading access...";
  try {
    const result = await api("/availability?target=" + encodeURIComponent(target));
    renderAvailabilityBadge(result);
    $("availability-output").textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    renderAvailabilityBadge(null);
    $("availability-output").textContent = "Access unavailable.\n\nReason: " + (error.body?.error || error.message);
  }
}

async function sourceTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  $("source-output").textContent = "Loading source...";
  try {
    const result = await api("/source?target=" + encodeURIComponent(target));
    $("source-output").textContent = result.source;
  } catch (error) {
    $("source-output").textContent = "Descriptor source unavailable.\n\nReason: " + (error.body?.error || error.message);
  }
}

async function summaryTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  $("summary-output").textContent = "Loading summary...";
  try {
    const result = await api("/summary?target=" + encodeURIComponent(target));
    $("summary-output").textContent = JSON.stringify(result.summary, null, 2);
  } catch (error) {
    $("summary-output").textContent = "Summary unavailable.\n\nReason: " + (error.body?.error || error.message);
  }
}

async function explainTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  const result = await api("/explain?target=" + encodeURIComponent(target));
  $("descriptor-title").textContent = result.summary?.type || target;
  write(result);
}

async function lineageTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  const result = await api("/lineage?target=" + encodeURIComponent(target));
  $("graph-title").textContent = target;
  drawGraph(result);
  renderEdges([...(result.backward || []), ...(result.forward || [])]);
  write(result);
}

async function publishTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  $("descriptor-title").textContent = "publish simulation: " + target;
  
  // Create a simulated PublishDescriptor for the UI
  const mockPublishDescriptor = {
    type: "PublishDescriptor",
    schema_version: "myc.publish.v0.1",
    fqdn: \`h.mock-publish.\${target}\`,
    commitment: {
      algorithm: "sha256",
      value: "pending-hash...",
      covers: "descriptor.body"
    },
    body: {
      publish_clearance: {
        target_fqdn: target,
        target_commitment: "mock-hash",
        export_scope: "single"
      },
      publication_gates: {
        naming_proof_verified: true,
        graph_verified: true,
        payload_scrubbed: true
      },
      destinations: [
        { protocol: "ipfs", address: "ipfs://pending..." }
      ]
    }
  };
  
  write(mockPublishDescriptor);
  switchTab("json");
}

async function adapterDryRunTarget() {
  const adapter = $("adapter-input").value.trim();
  if (!adapter) return;
  const result = await api("/adapter-dry-run?adapter=" + encodeURIComponent(adapter));
  $("descriptor-title").textContent = "adapter: " + adapter;
  write(result);
  switchTab("json");
}

async function recipeDryRunTarget() {
  const target = $("target-input").value.trim();
  if (!target) return;
  const result = await api("/recipe-dry-run?target=" + encodeURIComponent(target));
  $("descriptor-title").textContent = "recipe dry-run: " + target;
  write(result);
  switchTab("json");
}

function maybeLoadVerificationSource() {
  const value = $("target-input").value.trim();
  if (!value.startsWith("public/verification/")) return false;
  const name = value.split("/").pop();
  if (!name) return false;
  loadVerificationSource(name).catch((error) => write(error.body || error.message));
  return true;
}

function renderIndex() {
  const query = $("search-input").value.trim().toLowerCase();
  const list = $("index-list");
  const records = state.records
    .filter((record) => !query || JSON.stringify(record).toLowerCase().includes(query))
    .slice(0, 80);

  list.replaceChildren(...records.map((record) => {
    const row = document.createElement("div");
    row.className = "index-item";
    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = record.fqdn;
    const meta = document.createElement("span");
    const typeBadge = document.createElement("span");
    typeBadge.textContent = record.type;
    typeBadge.style.display = "inline-block";
    typeBadge.style.padding = "2px 6px";
    typeBadge.style.borderRadius = "4px";
    typeBadge.style.fontSize = "10px";
    typeBadge.style.fontWeight = "bold";
    typeBadge.style.marginRight = "6px";
    typeBadge.style.color = "#000";

    if (record.type === "IntentDescriptor") typeBadge.style.background = "var(--intent)";
    else if (record.type === "CapabilityDescriptor") typeBadge.style.background = "var(--capability)";
    else if (record.type === "SealedReceiptDescriptor") typeBadge.style.background = "var(--accent-2)";
    else if (record.type === "RecipeDescriptor") typeBadge.style.background = "var(--good)";
    else typeBadge.style.background = "var(--muted)";

    const nutrition = record.nutrition?.status ? " | " + record.nutrition.status : "";
    meta.append(typeBadge, document.createTextNode(nutrition + " | " + record.commitment.substring(0, 16) + "..."));
    
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Open";
    button.addEventListener("click", () => {
      setTarget(record.fqdn);
      if (record.receipt_name) {
        loadVerificationSource(record.receipt_name).catch((error) => write(error.body || error.message));
        return;
      }
      explainTarget();
    });
    text.append(title, meta);
    row.append(text, button);
    return row;
  }));
}

function scheduleSearch() {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    searchIndex().catch((error) => write(error.body || error.message));
  }, 160);
}

async function searchIndex() {
  const query = $("search-input").value.trim();
  if (!query) {
    await loadIndex();
    return;
  }
  const result = await api("/search?q=" + encodeURIComponent(query));
  state.records = result.results || [];
  setText("descriptor-value", String(result.count ?? state.records.length));
  renderIndex();
}

function restoreCachedLens() {
  const graph = readJson("myc.lastGraph");
  if (graph) {
    setText("graph-value", graph.ok ? "cached-ok" : "cached-failed", graph.ok ? "" : "bad");
    setText("descriptor-value", String(graph.descriptor_count ?? 0));
    setText("edge-value", String(graph.edge_count ?? 0));
    $("graph-title").textContent = "cached graph";
    $("graph-report").textContent = JSON.stringify({
      cached: true,
      ...graph,
    }, null, 2);
  }

  const snapshot = readJson("myc.lastGraphSnapshot");
  if (snapshot?.edges) {
    drawGraph({ backward: snapshot.edges, forward: [] });
    renderEdges(snapshot.edges);
  }

  const index = readJson("myc.lastIndex");
  if (index?.records) {
    state.records = index.records;
    setText("descriptor-value", String(index.count ?? state.records.length));
    renderIndex();
  }
}

function scheduleReconnect() {
  clearTimeout(state.reconnectTimer);
  state.reconnectTimer = setTimeout(() => {
    connect().catch(() => {});
  }, 15000);
}

function drawGraph(lineage) {
  const canvas = $("graph-canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfaf5";
  ctx.fillRect(0, 0, width, height);

  const edges = [...(lineage.backward || []), ...(lineage.forward || [])];
  if (!edges.length) {
    ctx.fillStyle = "#687064";
    ctx.font = "16px system-ui";
    ctx.fillText("no lineage edges", 28, 48);
    return;
  }

  const nodes = new Map();
  const add = (key, role) => {
    if (!key || nodes.has(key)) return;
    nodes.set(key, { key, role, x: 0, y: 0 });
  };

  for (const edge of edges) {
    add(edge.input?.fqdn || edge.input?.commitment, edge.input?.role || "input");
    add(edge.output?.fqdn || edge.output?.commitment, edge.output?.role || "output");
  }

  const nodeList = [...nodes.values()];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  nodeList.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / nodeList.length - Math.PI / 2;
    node.x = cx + Math.cos(angle) * radius;
    node.y = cy + Math.sin(angle) * radius;
  });

  ctx.lineWidth = 1.5;
  for (const edge of edges) {
    const a = nodes.get(edge.input?.fqdn || edge.input?.commitment);
    const b = nodes.get(edge.output?.fqdn || edge.output?.commitment);
    if (!a || !b) continue;
    ctx.strokeStyle = edge.direction === "retrospective" ? "#b4532a" : "#217c67";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (const node of nodeList) {
    ctx.fillStyle = node.role === "artifact" ? "#b4532a" : "#217c67";
    ctx.beginPath();
    ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#202520";
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    const label = node.key.length > 36 ? node.key.slice(0, 33) + "..." : node.key;
    ctx.fillText(label, Math.min(node.x + 10, width - 230), node.y + 4);
  }
}

function edgeEndpoint(edge, side) {
  const ref = side === "input" ? edge.input : edge.output;
  return ref?.fqdn || "";
}

function renderEdges(edges) {
  const list = $("edge-list");
  if (!edges.length) {
    list.replaceChildren();
    return;
  }

  list.replaceChildren(...edges.slice(0, 80).map((edge) => {
    const row = document.createElement("div");
    row.className = "edge-item";
    const title = document.createElement("strong");
    title.textContent = edge.step + " | " + edge.direction;
    const meta = document.createElement("span");
    meta.textContent = (edge.input?.role || "input") + " -> " + (edge.output?.role || "output");
    const fn = document.createElement("span");
    fn.textContent = edge.function_fqdn || "no function";
    const actions = document.createElement("div");
    actions.className = "edge-actions";

    const buttons = [
      ["Input", edgeEndpoint(edge, "input")],
      ["Output", edgeEndpoint(edge, "output")],
      ["Transform", edge.transform],
    ];

    for (const [label, target] of buttons) {
      if (!target) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        setTarget(target);
        explainTarget();
        lineageTarget();
      });
      actions.append(button);
    }

    row.append(title, meta, fn, actions);
    return row;
  }));
}

$("connect-btn").addEventListener("click", connect);
$("select-dir-btn").addEventListener("click", selectDirectory);
$("retry-btn").addEventListener("click", () => connect().catch((error) => write(error.body || error.message)));
$("verify-graph-btn").addEventListener("click", () => verifyGraph().catch((error) => write(error.body || error.message)));
$("load-graph-btn").addEventListener("click", () => loadGraph().catch((error) => write(error.body || error.message)));
$("load-index-btn").addEventListener("click", () => loadIndex().catch((error) => write(error.body || error.message)));
$("verification-btn").addEventListener("click", () => loadVerification().catch((error) => write(error.body || error.message)));
$("adapter-dry-run-btn").addEventListener("click", () => adapterDryRunTarget().catch((error) => write(error.body || error.message)));
$("recipe-dry-run-btn").addEventListener("click", () => recipeDryRunTarget().catch((error) => write(error.body || error.message)));
$("contribute-btn").addEventListener("click", () => contribute().catch((error) => write(error.body || error.message)));
$("publish-btn").addEventListener("click", () => publishTarget().catch((error) => write(error.body || error.message)));
$("resolve-btn").addEventListener("click", () => resolveTarget().catch((error) => write(error.body || error.message)));
$("explain-btn").addEventListener("click", () => {
  if (maybeLoadVerificationSource()) return;
  explainTarget().catch((error) => write(error.body || error.message));
});
$("lineage-btn").addEventListener("click", () => lineageTarget().catch((error) => write(error.body || error.message)));
$("search-input").addEventListener("input", scheduleSearch);
$("tab-json").addEventListener("click", () => switchTab("json"));
$("tab-render").addEventListener("click", async () => {
  switchTab("render");
  const target = $("target-input").value.trim();
  if (target) {
    $("render-output").innerHTML = "<p>Rendering document...</p>";
    try {
      const html = await renderDocument(target);
      $("render-output").innerHTML = html;
    } catch (e) {
      $("render-output").innerHTML = "<p class='bad'>Render failed: " + e.message + "</p>";
    }
  }
});
$("tab-availability").addEventListener("click", () => {
  switchTab("availability");
  availabilityTarget();
});
$("tab-summary").addEventListener("click", () => {
  switchTab("summary");
  summaryTarget();
});
$("tab-source").addEventListener("click", () => {
  switchTab("source");
  sourceTarget();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.deferredInstall = event;
  $("install-btn").hidden = false;
});

$("install-btn").addEventListener("click", async () => {
  if (!state.deferredInstall) return;
  state.deferredInstall.prompt();
  await state.deferredInstall.userChoice;
  state.deferredInstall = null;
  $("install-btn").hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

setTarget(initialTarget(), false);
connect().then(loadIndex).then(explainTarget).then(lineageTarget).catch(() => {});
`;

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

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405 });
    }

    if (url.pathname === "/snapshot.json") {
      return response(SNAPSHOT_JSON, "application/json; charset=utf-8");
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
