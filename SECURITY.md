# Security policy — myc

## Reporting a vulnerability

Please report security issues **privately**, not as a public issue or pull
request.

- **Preferred:** open a private advisory via GitHub Security Advisories ("Report
  a vulnerability") on this repository.
- If that is unavailable, contact the maintainer through the address in
  `LICENSE-INTENT.md` / `NOTICE`.

Include what you found, how to reproduce it, the affected commit, and the impact
you expect. We aim to acknowledge within a few days.

## Threat model — "trust the hash, not the host"

myc's job is to make a commitment publicly resolvable and auditable by hash. The
highest-value targets:

- **Resolution integrity** — anything that lets `h.<hash>` resolve to bytes that
  do **not** hash to that address, or that makes a mismatching resolution look
  valid. Content addressing is the whole trust model; breaking it is critical.
- **Lifecycle / finality forgery** — advancing a proposal to `implemented` or
  `evidence_verified` without the witnesses or the evidence that state requires.
- **Signature / registry integrity** — a claim that verifies as an authentic
  voice without a valid signature against the shared registry.
- **Payload leakage** — myc's own rule (`AGENTS.md`) forbids private payload
  bytes or private storage paths in public files. A path or payload that leaks
  private data into `public/` is a finding.

## What is *not* a vulnerability

- The code is intentionally **public and forkable** under AGPL. A fork is
  expected; it verifies as *unauthenticated* without key continuity.
- Content addresses are public by design — a hash reveals nothing but a
  commitment. Resolving a public commitment is the intended behaviour.
- Keys and private payloads live **outside** the public tree by design.

## Safe harbor

Good-faith research that respects these guidelines — no data destruction, no
service disruption, no access beyond what is needed to demonstrate the issue —
is welcome, and we will not pursue action against it.
