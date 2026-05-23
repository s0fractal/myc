#!/usr/bin/env -S deno run --allow-read
// myc/src/x4A00_capabilities.ts — myc capability surface projection
// position: 4/A → foundation(4) × mirror-pair(A) = foundation reflected
// hex_dipole: "00 00 00 00 6C 00 00 33"
//   foundation_container+0.85 (PRIMARY: capabilities are foundation; bucket 4 MATCH)
//   completion_frontier+0.20 (capability == authority commitment, terminal)
// placement_policy: axis
// intent: emit myc capability surface as structured JSON for substrate-self-ABI federation
// maturity: active
// horizon: enrich each capability with its CapabilityDescriptor schema once Phase 5 activates payload-bearing capabilities
//
// myc capabilities surface — slot 4/A of SUBSTRATE_SELF_ABI.v0.1
//
// Per trinity contract SUBSTRATE_SELF_ABI.v0.1.draft.md, each
// federation-participating substrate emits a capabilities organ at 4/A.
// This is myc's. Trinity reads the JSON envelope; never traverses raw
// `protocols/capabilities/` or `private/capabilities/` directly.
//
// Capability ≠ payload. Per myc's design (MYC.md), capability is
// requestable authority described without publishing the payload bytes
// that capability grants access to. This organ lists capability
// DRAFTS and any enabled CapabilityDescriptors, not the gated payloads.
//
// Reads:
//   protocols/capabilities/*.md  — formal capability drafts (Phase 5+)
//   private/capabilities/*.md    — local capability descriptors (gated)
//
// Emits JSON envelope per SUBSTRATE_SELF_ABI.v0.1:
//   { type, position, action, substrate, summary, capabilities: [...] }

import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
const MYC_ROOT = dirname(HERE);

interface CapabilityRecord {
  name: string;
  source: "protocols" | "private";
  status: "draft" | "enabled" | "checkpoint" | "unknown";
  rel_path: string;
}

async function scanCapabilityDir(
  subdir: "protocols/capabilities" | "private/capabilities",
): Promise<CapabilityRecord[]> {
  const dir = join(MYC_ROOT, subdir);
  const out: CapabilityRecord[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      if (entry.name === "README.md") continue;
      const text = await Deno.readTextFile(join(dir, entry.name));
      // Infer status from filename/body markers.
      let status: CapabilityRecord["status"] = "unknown";
      const lname = entry.name.toLowerCase();
      if (lname.includes(".draft")) status = "draft";
      else if (/design checkpoint|does not enable/i.test(text)) {
        status = "checkpoint";
      } else if (/CapabilityDescriptor/i.test(text)) status = "enabled";
      out.push({
        name: entry.name.replace(/\.draft\.md$|\.md$/, ""),
        source: subdir.startsWith("protocols") ? "protocols" : "private",
        status,
        rel_path: `${subdir}/${entry.name}`,
      });
    }
  } catch {
    // Dir missing — empty list (substrate-honest).
  }
  return out;
}

if (import.meta.main) {
  const wantJson = Deno.args.includes("--json");

  const [protocols, privateCaps] = await Promise.all([
    scanCapabilityDir("protocols/capabilities"),
    scanCapabilityDir("private/capabilities"),
  ]);
  const all = [...protocols, ...privateCaps].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const byStatus = new Map<string, number>();
  for (const c of all) {
    byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
  }

  const overall = all.length === 0
    ? "no-capabilities-declared"
    : all.every((c) => c.status === "checkpoint" || c.status === "draft")
    ? "draft-only"
    : "active";

  const receipt = {
    type: "capabilities",
    position: "4/A",
    action: "capabilities",
    substrate: "myc",
    note:
      "foundation × mirror-pair — myc's capability surface (requestable authority described WITHOUT publishing payload bytes)",
    summary: {
      overall,
      total: all.length,
      by_status: Object.fromEntries(byStatus),
    },
    capabilities: all,
    design_note:
      "Capability ≠ payload. Per MYC.md public_private_split: 'public-descriptor-private-payload'. This organ lists descriptors only; gated payloads stay private.",
    synonyms: ["capabilities", "authority", "capability-surface"],
  };

  if (wantJson) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(`# capabilities @ 4/A — myc capability surface`);
    console.log(`# ${"─".repeat(70)}`);
    console.log(`# overall: ${overall}`);
    console.log(`# total:   ${all.length}`);
    if (byStatus.size > 0) {
      const breakdown = Array.from(byStatus.entries())
        .map(([k, v]) => `${k}:${v}`).join("  ");
      console.log(`# status:  ${breakdown}`);
    }
    console.log(`# ${"─".repeat(70)}`);
    for (const c of all) {
      console.log(`#   [${c.source}] ${c.name.padEnd(30)} ${c.status}`);
    }
    if (all.length === 0) {
      console.log(`#   (no capability descriptors declared)`);
    }
  }
}
