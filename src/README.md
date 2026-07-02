---
chord:
  primary: "oct:5.1"
  secondary: ["oct:6.4", "oct:3.7"]
energy: 0.7
mode: "PATCH"
tension: "myc-mvp-tooling"
confidence: "medium"
receipt: "file"
---

# MYC Tools

`myc.ts` is the first small executable nerve of the local namespace.

It intentionally avoids model execution, P2P, Radicle, IPFS, and code
materialization. The goal is only to prove that raw commitments, descriptors,
function descriptors, naming proofs, artifacts, resolve, and verify can form a
closed local loop.

## Commands

```bash
deno task myc capture --text "зроби маленький тест" --actor s0fractal
deno task myc resolve task.s0fractal.h.<hash>.myc.md
deno task myc verify <myc>/public/objects/h/<hash>/...
deno task myc verify-graph
deno task myc lineage task.s0fractal.h.<hash>.myc.md
deno task myc explain task.s0fractal.h.<hash>.myc.md
deno task myc reproject h.<hash>.message.s0fractal.raw.myc.md
deno task myc serve --port 8787
deno task myc demo
deno task check
```

## Generated Shape

```text
public/functions/              # deterministic function descriptors
public/objects/h/<short>/      # raw, intent, naming proof, artifact
public/transforms/h/<short>/   # transformation descriptors
private/payloads/              # local raw payload bytes, ignored by git
public/index.ndjson            # generated resolver index
public/graph.ndjson            # generated transformation graph
```

Public descriptors do not contain private payload bytes. They point through
commitments and local resolver hints.

## Read-Only Companion API

```text
GET /health
GET /index
GET /resolve?fqdn=<fqdn>
GET /verify?target=<path-or-fqdn>&private=1
GET /verify-graph
GET /lineage?target=<path-or-fqdn>
GET /explain?target=<path-or-fqdn>
```

The companion API is intentionally read-only. It should become the first bridge
between a future `myc.md` PWA shell and the local namespace.

## Graph Verification

`verify-graph` checks that transformation descriptors are not just present, but
internally connected:

- function FQDNs resolve
- function commitments match
- input/output FQDNs resolve
- referenced commitments belong to the resolved node
- `public/graph.ndjson` matches the freshly computed graph

## Git Hook

Enable the tracked hook with:

```bash
git config core.hooksPath .githooks
```

The pre-commit hook runs `deno task check`.
