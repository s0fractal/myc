// Falsifier for the contribute-doorway dogfood (2026-07-01): `t myc propose` is the
// CANONICAL contribute path (install.sh + affordances). A newcomer in a terminal must
// see a friendly summary — the address, that it is DORMANT/keyless, and how it earns
// trust (lifecycle) — not raw JSON.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type ProposeResult, renderProposeHuman } from "./x5800_propose.ts";

Deno.test("renderProposeHuman: friendly summary for a newcomer, not JSON", () => {
  const ok: ProposeResult = {
    ok: true,
    fqdn: "h.d01a2bcc1140.proposal.myc.md",
    path: "public/proposals/h.d01a2bcc1140.proposal.myc.md",
    commitment: "sha256:" + "ab".repeat(32),
    state: "dormant",
  };
  const out = renderProposeHuman(ok, "trinity");
  assert(!out.trimStart().startsWith("{"), "must NOT be raw JSON");
  assert(out.includes(ok.fqdn!), "must show the proposal address");
  assert(/dormant/i.test(out), "must say it is dormant");
  assert(/witness/i.test(out), "must say it earns trust by witnessing");
  assert(
    /lifecycle/i.test(out),
    "must point to the lifecycle to watch it earn trust",
  );
  // a failed proposal renders an error, not JSON
  const bad = renderProposeHuman({
    ok: false,
    error: "proposal text is required",
  }, "");
  assert(bad.startsWith("✗"), "failure must render a plain error");
});
