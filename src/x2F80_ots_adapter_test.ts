import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseOtsInfo, verifyOtsProof } from "./x2F80_ots_adapter.ts";

// captured authoritative `ots info` output of the bootstrap proof (offline).
const OTS_INFO =
  `File sha256 hash: 8c9b98451de989661796ea6392da8c4c1b05d28559d78618abe0880bd7d0b9fb
Timestamp:
append 76b124d4165dd8892b7e0282a2aa298a
sha256
    verify PendingAttestation('https://bob.btc.calendar.opentimestamps.org')
    verify BitcoinBlockHeaderAttestation(949018)
    verify PendingAttestation('https://btc.calendar.catallaxy.com')
    verify BitcoinBlockHeaderAttestation(949022)`;

// A repository-LOCAL fixture. This used to reach ../../probes/... in Trinity,
// which resolves only when MYC is checked out nested inside it as a submodule:
// standalone, the file is absent, and with `ots` installed the suite reported
// available:true over an unreadable proof and failed. See fixtures/ots/README.md
// for the pinned digests and why the bytes are copied rather than regenerated.
const OTS_FIXTURE = new URL(
  "../fixtures/ots/spore-bootstrap-v0.root.ots",
  import.meta.url,
).pathname;

const OTS_SUBJECT = new URL(
  "../fixtures/ots/spore-bootstrap-v0.root",
  import.meta.url,
).pathname;

// The digests were recorded in fixtures/ots/README.md and nothing computed them,
// so "a swapped file fails loudly" was prose. It was not true: replacing the
// root with 64 zeroes left the adapter tests green, because the suite never
// opened that file at all. A digest a reader can see and a runner cannot check
// is documentation, and documentation is not a pin.
const PINNED: [string, string][] = [
  [
    OTS_SUBJECT,
    "8c9b98451de989661796ea6392da8c4c1b05d28559d78618abe0880bd7d0b9fb",
  ],
  [
    OTS_FIXTURE,
    "5eb5a18d3b365d8179111a2fc9a7b8648f8b30d0accdcdbc133e9d469eec80d3",
  ],
];

async function sha256File(path: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", await Deno.readFile(path));
  return Array.from(new Uint8Array(d)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

Deno.test("ots fixture — each vendored file matches its pinned digest", async () => {
  // Asserted INDEPENDENTLY, so a report names which file moved rather than that
  // something did.
  for (const [path, expected] of PINNED) {
    assertEquals(
      await sha256File(path),
      expected,
      `${path.split("/").pop()} does not match its pinned digest`,
    );
  }
});

Deno.test("ots fixture — MUTATION: changing either file turns the pin red", async () => {
  // Without this, the check above is a claim about a check nobody tested — which
  // is exactly how the digests came to be prose in the first place.
  const tmp = await Deno.makeTempDir({ prefix: "ots_fixture_" });
  try {
    for (const [path, expected] of PINNED) {
      const bytes = await Deno.readFile(path);
      const mutated = new Uint8Array(bytes);
      mutated[0] ^= 0xff; // one bit is enough; a pin that needs more is not a pin
      const copy = `${tmp}/${path.split("/").pop()}`;
      await Deno.writeFile(copy, mutated);
      const got = await sha256File(copy);
      assert(
        got !== expected,
        `mutating ${copy} did not change its digest`,
      );
    }
    // And the positive half: an untouched copy still matches, so the control is
    // discriminating rather than merely negative.
    const [path, expected] = PINNED[0];
    const same = `${tmp}/untouched`;
    await Deno.writeFile(same, await Deno.readFile(path));
    assertEquals(await sha256File(same), expected);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("ots — parseOtsInfo extracts subject + embedded Bitcoin attestations", () => {
  const i = parseOtsInfo(OTS_INFO);
  assertEquals(
    i.subject_digest,
    "8c9b98451de989661796ea6392da8c4c1b05d28559d78618abe0880bd7d0b9fb",
  );
  assertEquals(i.bitcoin_block_heights, [949018, 949022]);
  assertEquals(i.pending_attestations, 2);
});

Deno.test("ots — parseOtsInfo on empty/garbage yields no subject, no attestations (fail closed)", () => {
  const i = parseOtsInfo("not an ots info output");
  assertEquals(i.subject_digest, null);
  assertEquals(i.bitcoin_block_heights, []);
});

Deno.test("ots — verifyOtsProof is honest in BOTH environments (tool present or absent)", async () => {
  const path = OTS_FIXTURE;
  const v = await verifyOtsProof(path); // no --verify: offline `ots info` only
  // verify is ALWAYS one of the three honest states; it is never a fabricated pass.
  assert(["valid", "invalid", "unavailable"].includes(v.verify));
  if (!v.available) {
    // CI / no `ots` tool: honest unavailable, never an invented anchor.
    assertEquals(v.verify, "unavailable");
    assertEquals(v.subject_digest, null);
  } else {
    // tool present: it must read the real bootstrap subject + a Bitcoin attestation,
    // but WITHOUT --verify it never claims `valid`.
    assertEquals(
      v.subject_digest,
      "8c9b98451de989661796ea6392da8c4c1b05d28559d78618abe0880bd7d0b9fb",
    );
    assert(v.bitcoin_block_heights.length >= 1);
    assertEquals(v.verify, "unavailable"); // no --verify ⇒ on-chain header unchecked
  }
});

Deno.test("ots — an expected subject mismatch is invalid before on-chain standing", async () => {
  const path = OTS_FIXTURE;
  const v = await verifyOtsProof(path, {
    expectedSubject: `sha256:${"0".repeat(64)}`,
  });
  if (!v.available) return; // CI without ots remains honestly unavailable.
  assertEquals(v.verify, "invalid");
  assert(v.reason.includes("subject mismatch"));
});
