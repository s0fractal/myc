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
  const path = new URL(
    "../../probes/spore-bootstrap-pin-v0/external/spore-bootstrap-v0.root.ots",
    import.meta.url,
  ).pathname;
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
