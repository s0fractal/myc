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

      <div class="resolver-bar">
        <label for="resolver-url">local resolver</label>
        <input id="resolver-url" spellcheck="false" autocomplete="off">
        <button id="connect-btn" type="button">Connect</button>
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
              <button id="tab-availability" class="tab" type="button">Access</button>
              <button id="tab-summary" class="tab" type="button">Summary</button>
              <button id="tab-source" class="tab" type="button">Source</button>
            </div>
          </div>
          <pre id="output"></pre>
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
  color-scheme: light;
  --paper: #f7f4ec;
  --ink: #202520;
  --muted: #687064;
  --line: #c9c3b4;
  --surface: #fffdf7;
  --surface-2: #ece7dc;
  --accent: #217c67;
  --accent-2: #b4532a;
  --bad: #9a2f2f;
  --good: #24715b;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
}

button,
input {
  font: inherit;
}

button {
  border: 1px solid #1f5c4f;
  border-radius: 6px;
  background: var(--accent);
  color: white;
  min-height: 38px;
  padding: 0 14px;
  cursor: pointer;
}

button.secondary {
  background: var(--surface);
  color: var(--ink);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

input {
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  padding: 0 11px;
  min-width: 0;
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
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
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
    radial-gradient(circle at 50% 50%, var(--accent) 0 4px, transparent 5px),
    conic-gradient(from 0deg, #217c67, #d08b43, #5d7569, #217c67);
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

.resolver-bar {
  grid-template-columns: auto minmax(180px, 1fr) auto;
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
  padding: 12px;
  font-size: 12px;
  line-height: 1.45;
  background: #fbfaf5;
}

canvas {
  display: block;
  width: 100%;
  height: 420px;
  background: #fbfaf5;
}

#graph-report {
  min-height: 120px;
  max-height: 180px;
  border-top: 1px solid var(--line);
}

.edge-list {
  display: grid;
  gap: 6px;
  max-height: 210px;
  overflow: auto;
  border-top: 1px solid var(--line);
  padding: 8px;
  background: #fbfaf5;
}

.edge-item {
  display: grid;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px;
  background: var(--surface);
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
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fbfaf5;
  padding: 9px 10px;
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
  const value = $("resolver-url").value.trim().replace(/\\/+$/, "");
  state.resolver = value || DEFAULT_RESOLVER;
  localStorage.setItem("myc.resolver", state.resolver);
  return state.resolver;
}

async function api(path) {
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

function initialTarget() {
  const host = location.hostname;
  if (host !== "myc.md" && !host.endsWith(".workers.dev")) return host;
  const path = decodeURIComponent(location.pathname.replace(/^\\/+/, ""));
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
  $("tab-availability").classList.toggle("active", tab === "availability");
  $("tab-summary").classList.toggle("active", tab === "summary");
  $("tab-source").classList.toggle("active", tab === "source");
  $("output").hidden = tab !== "json";
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
      $("availability-output").textContent = "Access unavailable.\\n\\nReason: " + (error.body?.error || error.message);
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
    $("availability-output").textContent = "Access unavailable.\\n\\nReason: " + (error.body?.error || error.message);
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
    $("source-output").textContent = "Descriptor source unavailable.\\n\\nReason: " + (error.body?.error || error.message);
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
    $("summary-output").textContent = "Summary unavailable.\\n\\nReason: " + (error.body?.error || error.message);
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

async function adapterDryRunTarget() {
  const adapter = $("adapter-input").value.trim();
  if (!adapter) return;
  const result = await api("/adapter-dry-run?adapter=" + encodeURIComponent(adapter));
  $("descriptor-title").textContent = "adapter: " + adapter;
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
    const nutrition = record.nutrition?.status ? " | " + record.nutrition.status : "";
    meta.textContent = record.type + nutrition + " | " + record.commitment;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Open";
    button.addEventListener("click", () => {
      setTarget(record.fqdn);
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
$("retry-btn").addEventListener("click", () => connect().catch((error) => write(error.body || error.message)));
$("verify-graph-btn").addEventListener("click", () => verifyGraph().catch((error) => write(error.body || error.message)));
$("load-graph-btn").addEventListener("click", () => loadGraph().catch((error) => write(error.body || error.message)));
$("load-index-btn").addEventListener("click", () => loadIndex().catch((error) => write(error.body || error.message)));
$("verification-btn").addEventListener("click", () => loadVerification().catch((error) => write(error.body || error.message)));
$("adapter-dry-run-btn").addEventListener("click", () => adapterDryRunTarget().catch((error) => write(error.body || error.message)));
$("resolve-btn").addEventListener("click", () => resolveTarget().catch((error) => write(error.body || error.message)));
$("explain-btn").addEventListener("click", () => {
  if (maybeLoadVerificationSource()) return;
  explainTarget().catch((error) => write(error.body || error.message));
});
$("lineage-btn").addEventListener("click", () => lineageTarget().catch((error) => write(error.body || error.message)));
$("search-input").addEventListener("input", scheduleSearch);
$("tab-json").addEventListener("click", () => switchTab("json"));
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

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405 });
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
