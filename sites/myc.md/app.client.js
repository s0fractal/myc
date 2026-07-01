// GENERATED-FREE, EDIT DIRECTLY. Served verbatim by worker.ts at /app.js
// (import ... with { type: "text" }). NOT a template literal — normal JS,
// so regexes and the commitment separator work with single backslashes.
// The one build-time value is __RESOLVER_DEFAULT__ (worker replaces it).

const DEFAULT_RESOLVER = "__RESOLVER_DEFAULT__";
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

  const jsonMatch = text.match(/```json myc\n([\s\S]*?)\n```/);
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
  
  body = body.replace(/```(.*?)\n([\s\S]*?)```/g, "<pre class='code-block'><code class='language-$1'>$2</code></pre>");
  body = body.replace(/`(.*?)`/g, "<code>$1</code>");
  
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
      source = source.replace(embed.full, `<div class="embedded-doc" data-fqdn="${embed.targetFqdn}">
        <div class="embedded-header">${embed.targetFqdn}</div>
        <div class="embedded-body">${embeddedHtml}</div>
      </div>`);
    }
    
    let html = renderMarkdown(source);
    
    const customStyle = fm.lens || fm.style;
    if (customStyle && depth === 0) {
      try {
        const styleRes = await api("/source?target=" + encodeURIComponent(customStyle));
        const styleText = styleRes.source;
        if (styleText) {
          let css = styleText;
          const cssMatch = styleText.match(/```css\n([\s\S]*?)```/);
          if (cssMatch) css = cssMatch[1];
          html = `<style id="lens-stylesheet">${css}</style>` + html;
        }
      } catch (e) {
        console.warn("Failed to load lens style: " + customStyle, e);
      }
    }
    
    return html;
  } catch (e) {
    return `<p class='bad'>Failed to resolve transclusion: ${target}. Error: ${e.message}</p>`;
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
    if (state.resolver === DEFAULT_RESOLVER) {
      console.log("Local resolver offline. Trying fallback to published snapshot on " + window.location.origin);
      state.resolver = window.location.origin;
      $("resolver-url").value = state.resolver;
      try {
        const health = await api("/health");
        setText("health-value", "published snapshot", "ok");
        setText("version-value", health.version || "unknown");
        setConnection("using published snapshot fallback", "online");
        write(health);
        await verifyGraph();
        return;
      } catch (fallbackError) {
        state.resolver = DEFAULT_RESOLVER;
        $("resolver-url").value = state.resolver;
        handleOffline(fallbackError);
      }
    } else {
      handleOffline(error);
    }
  }
}

function handleOffline(error) {
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
    fqdn: `h.mock-publish.${target}`,
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
// Live pulse: real network numbers on load, from this origin's published
// snapshot (works with no local resolver). Makes the page feel alive.
async function loadPulse() {
  const origin = window.location.origin;
  const j = async (path) => {
    try {
      const r = await fetch(origin + path);
      return await r.json();
    } catch (e) {
      return {};
    }
  };
  const [health, index, graph] = await Promise.all([
    j("/health"),
    j("/index"),
    j("/graph"),
  ]);
  if (index && index.count != null) $("pulse-desc").textContent = index.count;
  if (graph && graph.count != null) $("pulse-edges").textContent = graph.count;
  if ($("pulse-src")) {
    $("pulse-src").textContent = (health && health.version) ? "snapshot" : "live";
  }
}

// Doors — light on-ramps.
if ($("door-browse")) {
  $("door-browse").addEventListener("click", () => {
    const d = $("deep");
    if (d) d.open = true;
    const s = $("search-input");
    if (s) {
      s.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => s.focus(), 320);
    }
  });
}
if ($("door-join")) {
  $("door-join").addEventListener("click", () => {
    const r = $("join-reveal");
    if (r) r.hidden = !r.hidden;
  });
}
if ($("door-think")) {
  $("door-think").addEventListener("click", () => {
    const d = $("deep");
    if (d) d.open = true;
    const c = $("contribute-text");
    if (c) {
      c.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => c.focus(), 320);
    }
  });
}
if ($("copy-install")) {
  $("copy-install").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("join-cmd-text").textContent);
      $("copy-install").textContent = "скопійовано ✓";
    } catch (e) {
      /* clipboard blocked — the command is visible to select */
    }
  });
}

loadPulse();
connect().then(loadIndex).then(explainTarget).then(lineageTarget).catch(() => {});
