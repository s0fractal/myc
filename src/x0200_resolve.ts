// src/x0200_resolve.ts — resolve (coordinate → file → proof, from anywhere in the graph)
//
// The substrate graph is a flat coordinate space: every node is `xNNNN_name.myc.md`
// (or .md). A name is a resolvable, provable link — give the resolver a coordinate
// and it finds the file ANYWHERE in the local graph and tells you how trustworthy it
// is, by either of two independent proof modes:
//
//   git    — the file is tracked: its commit trail IS the witness (who changed it,
//            when, and with what INTENT — the commit messages). Proves provenance
//            through recorded history, no keys needed.
//   crypto — the file carries a `provenance:` frontmatter block: a content
//            commitment (canonically binding the FQDN to the body) and a signature.
//            Proves integrity for files that live anywhere (Drive, Desktop, p2p),
//            even outside any repo.
//
// A document is "proven" if EITHER mode validates. The two are complementary: git
// proves the social/historical chain; crypto proves the bytes and the signer.
//
// Usage:
//   deno run -A src/x0200_resolve.ts <coordinate> [--cat] [--json]
//     <coordinate> : x0000 | x0000_spec_provenance | x0000.HOW-TO.myc.md
//     --cat        : also print the resolved file's content
//     --json       : machine-readable (LLM-friendly); default is a human table
//
// MYC_GRAPH_ROOT env overrides the search root (default: the git superproject,
// i.e. the whole substrate graph when run from any submodule).

import {
  dirname,
  join,
  relative,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const FILE_RE = /^x([0-9A-Fa-f]{4})[_.](.+?)\.(?:myc\.md|md)$/i;

interface ProofGit {
  tracked: boolean;
  head: { sha: string; author: string; date: string; intent: string } | null;
  history: number;
}
interface ProofCrypto {
  present: boolean;
  ok: boolean;
  detail: string;
}
interface Match {
  fqdn: string;
  path: string;
  coordinate: string;
  proven: boolean;
  git: ProofGit;
  crypto: ProofCrypto;
}

async function sh(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; out: string }> {
  const p = await new Deno.Command(cmd, {
    args,
    cwd,
    stdout: "piped",
    stderr: "null",
  }).output();
  return { code: p.code, out: new TextDecoder().decode(p.stdout) };
}

/** The whole-graph root: the git superproject if we're in a submodule, else the
 * repo toplevel, else cwd. MYC_GRAPH_ROOT overrides. */
async function graphRoot(): Promise<string> {
  const env = Deno.env.get("MYC_GRAPH_ROOT");
  if (env) return env;
  const cwd = Deno.cwd();
  const sup = await sh("git", [
    "rev-parse",
    "--show-superproject-working-tree",
  ], cwd);
  if (sup.code === 0 && sup.out.trim()) return sup.out.trim();
  const top = await sh("git", ["rev-parse", "--show-toplevel"], cwd);
  if (top.code === 0 && top.out.trim()) return top.out.trim();
  return cwd;
}

const SKIP = new Set([
  ".git",
  "node_modules",
  ".wrangler",
  "target",
  "dist",
  ".cache",
]);

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const e of Deno.readDir(dir)) entries.push(e);
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".") {
      if (SKIP.has(e.name)) continue;
    }
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory) yield* walk(full);
    else if (e.isFile) yield full;
  }
}

/** Normalize a query to {coord, handle?}. Accepts x0000, x0000_name, x0000.NAME,
 * with or without the .myc.md/.md suffix. */
function parseQuery(
  q: string,
): { coord: string; handle: string | null } | null {
  const stripped = q.trim().replace(/\.(?:myc\.md|md)$/i, "");
  const m = stripped.match(/^x([0-9A-Fa-f]{4})(?:[_.](.+))?$/i);
  if (!m) return null;
  return {
    coord: m[1].toLowerCase(),
    handle: m[2] ? m[2].toLowerCase() : null,
  };
}

function fileMeta(path: string): { coord: string; handle: string } | null {
  const name = path.split("/").pop() ?? "";
  const m = name.match(FILE_RE);
  if (!m) return null;
  return { coord: m[1].toLowerCase(), handle: m[2].toLowerCase() };
}

function splitFrontmatter(text: string): { fm: string; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: "", body: text };
  return { fm: m[1], body: m[2] };
}

/** Canonical content commitment: sha256 over `fqdn\n` + body. Binds the
 * coordinate (the NAME) to the bytes, so a signed body cannot be replayed under
 * a different coordinate. */
async function canonicalCommitment(
  fqdn: string,
  body: string,
): Promise<string> {
  // Normalize trailing whitespace so the commitment is stable across editors /
  // final-newline differences (whitespace at the end is not semantic content).
  const data = new TextEncoder().encode(fqdn + "\n" + body.trimEnd());
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return "sha256:" + hex;
}

async function gitProof(path: string): Promise<ProofGit> {
  // Run git in the file's OWN repo — submodules (other substrates) have their
  // own history; the superproject only tracks their commit pointer.
  const dir = dirname(path);
  const top = await sh("git", ["rev-parse", "--show-toplevel"], dir);
  if (top.code !== 0 || !top.out.trim()) {
    return { tracked: false, head: null, history: 0 };
  }
  const repo = top.out.trim();
  const rel = relative(repo, path);
  const log = await sh("git", [
    "log",
    "--follow",
    "--format=%H%x1f%an%x1f%aI%x1f%s",
    "--",
    rel,
  ], repo);
  const lines = log.out.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return { tracked: false, head: null, history: 0 };
  const [sha, author, date, intent] = lines[0].split("\x1f");
  return {
    tracked: true,
    head: { sha: sha.slice(0, 12), author, date: date.slice(0, 10), intent },
    history: lines.length,
  };
}

async function cryptoProof(
  fqdn: string,
  fm: string,
  body: string,
): Promise<ProofCrypto> {
  // The provenance block is a nested `provenance:` map; we read the committed
  // value and (optionally) the signer. Signature verification is a follow-up
  // (needs the signer's public key from their voice profile); here we verify the
  // content commitment, which is the integrity half.
  const hasBlock = /^\s*provenance\s*:/m.test(fm);
  if (!hasBlock) {
    return { present: false, ok: false, detail: "no provenance block" };
  }
  const committed = fm.match(/commitment\s*:\s*["']?(sha256:[0-9a-f]+)/i)?.[1];
  if (!committed) {
    return {
      present: true,
      ok: false,
      detail: "provenance block lacks a sha256 commitment",
    };
  }
  const recomputed = await canonicalCommitment(fqdn, body);
  if (recomputed === committed) {
    const signer = fm.match(/signer\s*:\s*["']?([^"'\n]+)/i)?.[1]?.trim();
    return {
      present: true,
      ok: true,
      detail: signer
        ? `commitment OK (signer: ${signer}; signature check is a follow-up)`
        : "commitment OK (unsigned)",
    };
  }
  return {
    present: true,
    ok: false,
    detail: "commitment MISMATCH — content changed or wrong canonicalization",
  };
}

async function proveFile(
  root: string,
  path: string,
  meta: { coord: string; handle: string },
): Promise<Match> {
  const { fm, body } = splitFrontmatter(await Deno.readTextFile(path));
  const fqdn = `x${meta.coord}_${meta.handle}.myc.md`;
  const [git, crypto] = await Promise.all([
    gitProof(path),
    cryptoProof(fqdn, fm, body),
  ]);
  return {
    fqdn,
    path: relative(root, path),
    coordinate: `x${meta.coord}`,
    proven: git.tracked || crypto.ok,
    git,
    crypto,
  };
}

async function resolve(query: string): Promise<Match[]> {
  const q = parseQuery(query);
  if (!q) return [];
  const root = await graphRoot();
  const matches: Match[] = [];
  for await (const path of walk(root)) {
    const meta = fileMeta(path);
    if (!meta || meta.coord !== q.coord) continue;
    // The query handle is a hint: a file matches if its handle contains it
    // (so "x7500_952374" resolves "x7500_952374_claude_...slug"). Exactness is
    // used only for ranking below.
    if (q.handle && !meta.handle.includes(q.handle)) continue;
    matches.push(await proveFile(root, path, meta));
  }
  // Exact fqdn/handle match first, then by path.
  matches.sort((a, b) => {
    const ah = q.handle && a.fqdn.toLowerCase().includes(q.handle) ? 0 : 1;
    const bh = q.handle && b.fqdn.toLowerCase().includes(q.handle) ? 0 : 1;
    return ah - bh || a.path.localeCompare(b.path);
  });
  return matches;
}

// ── the deepening: resolve causality, not just nodes ─────────────────────────
//
// A node answers WHAT it is. Its causal edges answer WHY it is in this state:
// `hears:` (the inputs that produced it), `references:`/`closes:` (what it
// affects), and the git INTENT (the stated why). Each causal step is itself a
// resolvable, provable node — so the why-chain is navigable and trustworthy from
// any point. ЧОМУ becomes as resolvable and provable as ЩО.

function fmList(fm: string, key: string): string[] {
  const lines = fm.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    if (new RegExp(`^${key}\\s*:\\s*$`).test(line)) {
      inList = true;
      continue;
    }
    if (!inList) continue;
    const m = line.match(/^\s+-\s*(.+?)\s*$/);
    if (m) {
      out.push(m[1].replace(/^["']|["']$/g, ""));
      continue;
    }
    if (line.trim() === "") continue;
    if (/^\S/.test(line)) break; // next top-level key ends the list
  }
  return out;
}

function looksLikeCoordinate(s: string): boolean {
  return /^x[0-9A-Fa-f]{4}[_.]/.test(s.trim().replace(/^["']|["']$/g, ""));
}

interface Cause {
  kind: "node" | "external";
  ref: string;
  resolved: Match | null;
}
interface Why {
  node: Match;
  intent: string | null;
  causes: Cause[];
  closes: string | null;
}

async function whyOf(query: string): Promise<Why | null> {
  const matches = await resolve(query);
  if (matches.length === 0) return null;
  const node = matches[0];
  const text = await Deno.readTextFile(join(await graphRoot(), node.path));
  const { fm } = splitFrontmatter(text);
  const edges = [...fmList(fm, "hears"), ...fmList(fm, "references")];
  const closes = fm.match(/path_hint\s*:\s*["']?([^"'\n]+)/)?.[1]?.trim() ??
    null;
  const causes: Cause[] = [];
  for (const e of edges) {
    if (looksLikeCoordinate(e)) {
      const coord = e.trim().replace(/^["']|["']$/g, "").split(/[\s(]/)[0];
      const r = await resolve(coord);
      causes.push({ kind: "node", ref: coord, resolved: r[0] ?? null });
    } else {
      causes.push({ kind: "external", ref: e, resolved: null });
    }
  }
  return {
    node,
    intent: node.git.head?.intent ??
      (node.crypto.ok ? node.crypto.detail : null),
    causes,
    closes,
  };
}

function seal(m: Match): string {
  return m.crypto.ok ? "🔐" : (m.git.tracked ? "📜" : "⚠️");
}

/** Add/refresh a `provenance` block with the canonical {fqdn,body} commitment,
 * so a file is tamper-evident and coordinate-bound even outside any repo. The
 * body is untouched (frontmatter-only), so the commitment stays valid. */
function upsertProvenance(
  fm: string,
  signer: string,
  commitment: string,
): string {
  const stripped = fm.replace(/^provenance:\s*\n(?:[ \t]+.*\n?)*/m, "")
    .trimEnd();
  return `${stripped}\nprovenance:\n  signer: ${signer}\n  commitment: "${commitment}"`;
}

/** Does a hears/references entry cite the target node? */
function citesNode(
  entry: string,
  target: { coord: string; handle: string },
): boolean {
  if (!looksLikeCoordinate(entry)) return false;
  const stem = entry.trim().replace(/^["']|["']$/g, "").split(/[\s(]/)[0];
  const q = parseQuery(stem);
  if (!q || q.coord !== target.coord) return false;
  if (!q.handle) return true;
  return target.handle.includes(q.handle);
}

/** Forward edges: the nodes that cite this one (its effects in the lattice). */
async function effectsOf(node: Match): Promise<Match[]> {
  const root = await graphRoot();
  const target = fileMeta(node.path);
  if (!target) return [];
  const out: Match[] = [];
  for await (const path of walk(root)) {
    if (relative(root, path) === node.path) continue;
    const meta = fileMeta(path);
    if (!meta) continue;
    const { fm } = splitFrontmatter(await Deno.readTextFile(path));
    const edges = [...fmList(fm, "hears"), ...fmList(fm, "references")];
    if (edges.some((e) => citesNode(e, target))) {
      out.push(await proveFile(root, path, meta));
    }
  }
  return out;
}

// ── the whole graph: trust topology integrity ───────────────────────────────
//
// `--graph` walks from one node; `--lattice` takes in the WHOLE shape at once and
// reports where trust holds and where it is missing: how many nodes are proven
// (git intent or crypto commitment), how many causal edges bind them, and —
// crucially — which citations are DANGLING (a `hears:`/`references:` that resolves
// to no node: the wiki's broken links). The topology should not hide its gaps.

interface LatticeNode {
  fqdn: string;
  path: string;
  coord: string;
  handle: string;
  proven: boolean;
  crypto: boolean;
  git: boolean;
  outRefs: string[];
}

/** All git-tracked paths across the superproject AND its submodules, in one call
 * — so a node counts as git-proven without a per-file `git log`. */
async function trackedSet(root: string): Promise<Set<string>> {
  const r = await sh("git", ["ls-files", "--recurse-submodules"], root);
  if (r.code !== 0) return new Set();
  return new Set(r.out.split("\n").filter(Boolean));
}

async function buildLattice(): Promise<LatticeNode[]> {
  const root = await graphRoot();
  const tracked = await trackedSet(root);
  const nodes: LatticeNode[] = [];
  for await (const path of walk(root)) {
    const meta = fileMeta(path);
    if (!meta) continue;
    const rel = relative(root, path);
    const { fm, body } = splitFrontmatter(await Deno.readTextFile(path));
    const fqdn = `x${meta.coord}_${meta.handle}.myc.md`;
    const c = await cryptoProof(fqdn, fm, body);
    const isGit = tracked.has(rel);
    const outRefs = [...fmList(fm, "hears"), ...fmList(fm, "references")]
      .filter(looksLikeCoordinate)
      .map((e) => e.trim().replace(/^["']|["']$/g, "").split(/[\s(]/)[0]);
    nodes.push({
      fqdn,
      path: rel,
      coord: meta.coord,
      handle: meta.handle,
      proven: isGit || c.ok,
      crypto: c.ok,
      git: isGit,
      outRefs,
    });
  }
  return nodes;
}

interface Lattice {
  nodes: number;
  proven: number;
  git: number;
  crypto: number;
  edges: number;
  dangling: { from: string; ref: string }[];
  unproven: string[];
  orphans: string[];
  hub: { fqdn: string; inDegree: number } | null;
}

function analyzeLattice(nodes: LatticeNode[]): Lattice {
  const byCoord = new Map<string, LatticeNode[]>();
  for (const n of nodes) {
    const a = byCoord.get(n.coord) ?? [];
    a.push(n);
    byCoord.set(n.coord, a);
  }
  const inDeg = new Map<string, number>();
  const dangling: { from: string; ref: string }[] = [];
  let edges = 0;
  for (const n of nodes) {
    for (const ref of n.outRefs) {
      edges++;
      const q = parseQuery(ref);
      const hits = q
        ? (byCoord.get(q.coord) ?? []).filter((t) =>
          !q.handle || t.handle.includes(q.handle)
        )
        : [];
      if (hits.length === 0) {
        dangling.push({ from: n.fqdn, ref });
      } else {
        for (const t of hits) {
          inDeg.set(t.fqdn, (inDeg.get(t.fqdn) ?? 0) + 1);
        }
      }
    }
  }
  let hub: { fqdn: string; inDegree: number } | null = null;
  for (const [fqdn, d] of inDeg) {
    if (!hub || d > hub.inDegree) hub = { fqdn, inDegree: d };
  }
  return {
    nodes: nodes.length,
    proven: nodes.filter((n) => n.proven).length,
    git: nodes.filter((n) => n.git).length,
    crypto: nodes.filter((n) => n.crypto).length,
    edges,
    dangling,
    unproven: nodes.filter((n) => !n.proven).map((n) => n.fqdn),
    orphans: nodes.filter((n) =>
      n.outRefs.length === 0 && (inDeg.get(n.fqdn) ?? 0) === 0
    ).map((n) => n.fqdn),
    hub,
  };
}

async function main() {
  const args = Deno.args;
  const json = args.includes("--json");
  const cat = args.includes("--cat");
  const why = args.includes("--why");
  const stampIdx = args.indexOf("--stamp");
  const stampSigner = stampIdx >= 0 ? args[stampIdx + 1] : undefined;
  const stampValueIdx = stampIdx >= 0 ? stampIdx + 1 : -1;

  // --lattice: the whole graph at once — trust topology integrity. No query.
  if (args.includes("--lattice")) {
    const l = analyzeLattice(await buildLattice());
    if (json) {
      console.log(JSON.stringify({ type: "lattice", ...l }, null, 2));
      return;
    }
    const pct = l.nodes ? Math.round((l.proven / l.nodes) * 100) : 0;
    console.log(`🕸  trust topology — ${l.nodes} nodes in the lattice`);
    console.log(
      `   proven:    ${l.proven}/${l.nodes} (${pct}%)  📜 git ${l.git} · 🔐 crypto ${l.crypto}`,
    );
    console.log(
      `   unproven:  ${l.unproven.length}  ⚠️  (untracked & unsigned)`,
    );
    console.log(`   edges:     ${l.edges} causal links`);
    console.log(`   orphans:   ${l.orphans.length}  (no edges in or out)`);
    if (l.hub) {
      console.log(`   hub:       ${l.hub.fqdn} (${l.hub.inDegree} cite it)`);
    }
    console.log(
      `   dangling:  ${l.dangling.length}  (citations that resolve to no node)`,
    );
    const SHOW = 12;
    for (const d of l.dangling.slice(0, SHOW)) {
      console.log(
        `     ⚠️ ${d.from}\n        → ${d.ref}  (cited but unresolved)`,
      );
    }
    if (l.dangling.length > SHOW) {
      console.log(
        `     …and ${l.dangling.length - SHOW} more (--json for all)`,
      );
    }
    console.log(
      l.dangling.length === 0
        ? `   ✓ no broken links — every citation resolves to a node`
        : `   (fix: stamp/commit the target, or correct the citing coordinate)`,
    );
    return;
  }

  const query = args.find((a, i) => !a.startsWith("--") && i !== stampValueIdx);
  if (!query) {
    console.error(
      "usage: resolve <coordinate> [--why] [--cat] [--json]  (e.g. x0000_spec_provenance)",
    );
    Deno.exit(1);
  }

  // --stamp <signer>: write a canonical {fqdn,body} commitment into the file's
  // provenance block, making it crypto-provable anywhere.
  if (stampSigner) {
    const matches = await resolve(query);
    if (matches.length === 0) {
      console.log(`# stamp "${query}" → not found`);
      Deno.exit(1);
    }
    const path = join(await graphRoot(), matches[0].path);
    const text = await Deno.readTextFile(path);
    const { fm, body } = splitFrontmatter(text);
    if (!fm) {
      console.log(`# stamp "${query}" → no frontmatter to stamp`);
      Deno.exit(1);
    }
    const commitment = await canonicalCommitment(matches[0].fqdn, body);
    const newFm = upsertProvenance(fm, stampSigner, commitment);
    await Deno.writeTextFile(path, `---\n${newFm}\n---\n${body}`);
    console.log(
      json
        ? JSON.stringify(
          {
            type: "stamp",
            fqdn: matches[0].fqdn,
            signer: stampSigner,
            commitment,
          },
          null,
          2,
        )
        : `🔐 stamped ${
          matches[0].fqdn
        }\n   signer:     ${stampSigner}\n   commitment: ${commitment}`,
    );
    return;
  }

  // --graph: the node's local TOPOLOGY — causes (backward) and effects
  // (forward), each itself a proven node. The lattice, navigable from any point.
  if (args.includes("--graph")) {
    const m = await resolve(query);
    if (m.length === 0) {
      console.log(`# graph "${query}" → not found`);
      Deno.exit(1);
    }
    const node = m[0];
    const w = await whyOf(query);
    const effects = await effectsOf(node);
    if (json) {
      console.log(
        JSON.stringify(
          { type: "graph", node, causes: w?.causes ?? [], effects },
          null,
          2,
        ),
      );
      return;
    }
    console.log(`🗺  ${seal(node)} ${node.fqdn}`);
    console.log(`   intent: ${node.git.head?.intent ?? "(none)"}`);
    const causeNodes = (w?.causes ?? []).filter((c) =>
      c.kind === "node" && c.resolved
    );
    console.log(`   ↑ caused by (${causeNodes.length}):`);
    for (const c of causeNodes) {
      console.log(
        `     ${seal(c.resolved!)} ${c.resolved!.fqdn}  "${
          c.resolved!.git.head?.intent ?? c.resolved!.crypto.detail
        }"`,
      );
    }
    console.log(`   ↓ feeds into (${effects.length}):`);
    for (const e of effects) {
      console.log(`     ${seal(e)} ${e.fqdn}  "${e.git.head?.intent ?? ""}"`);
    }
    console.log(
      `   (walk it: resolve --graph <any-coord-above>)`,
    );
    return;
  }

  // --why: resolve the causal chain, each step itself proven.
  if (why) {
    const w = await whyOf(query);
    if (!w) {
      console.log(`# why "${query}" → not found`);
      Deno.exit(1);
    }
    if (json) {
      console.log(JSON.stringify({ type: "why", query, ...w }, null, 2));
      return;
    }
    console.log(`🔭 why  ${seal(w.node)} ${w.node.fqdn}`);
    console.log(`   intent: ${w.intent ? `"${w.intent}"` : "(none)"}`);
    if (w.closes) console.log(`   ⇒ closes/affects: ${w.closes}`);
    if (w.causes.length === 0) {
      console.log(`   ↑ because: (no declared causes — a root)`);
    } else {
      console.log(`   ↑ because it heard / references:`);
      for (const c of w.causes) {
        if (c.kind === "node" && c.resolved) {
          const i = c.resolved.git.head?.intent ?? c.resolved.crypto.detail;
          console.log(
            `     ${seal(c.resolved)} ${c.resolved.fqdn}  "${i}"`,
          );
        } else if (c.kind === "node") {
          console.log(`     ⚠️ ${c.ref}  (referenced but unresolved)`);
        } else {
          console.log(`     · ${c.ref}`);
        }
      }
      console.log(
        `   (each node above is itself resolvable: resolve --why <coord>)`,
      );
    }
    return;
  }

  const matches = await resolve(query);
  if (json) {
    console.log(JSON.stringify({ type: "resolve", query, matches }, null, 2));
    return;
  }
  if (matches.length === 0) {
    console.log(`# resolve "${query}" → not found in the local graph`);
    Deno.exit(1);
  }
  for (const m of matches) {
    console.log(`${seal(m)} ${m.fqdn}`);
    console.log(`   path:   ${m.path}`);
    if (m.git.tracked && m.git.head) {
      console.log(
        `   git:    ${m.git.head.sha} · ${m.git.head.author} · ${m.git.head.date} · "${m.git.head.intent}" (${m.git.history} commits)`,
      );
    } else {
      console.log(`   git:    not tracked`);
    }
    console.log(`   crypto: ${m.crypto.detail}`);
    console.log(
      `   proven: ${m.proven ? "yes" : "NO — untracked and unsigned"}`,
    );
  }
  console.log(`   (why is it here? → resolve --why ${query})`);
  if (cat && matches[0]) {
    console.log("\n" + "─".repeat(60) + "\n");
    console.log(
      await Deno.readTextFile(join(await graphRoot(), matches[0].path)),
    );
  }
}

if (import.meta.main) await main();

export { canonicalCommitment, parseQuery, resolve };
