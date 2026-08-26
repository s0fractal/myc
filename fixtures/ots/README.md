# OpenTimestamps test fixture

`x2F80_ots_adapter_test.ts` needs a real `.ots` proof to exercise both honest
states of `verifyOtsProof` — tool present and tool absent. It used to read one
from `../../probes/spore-bootstrap-pin-v0/external/`, which is **outside this
repository**. That path resolves only because the usual checkout sits nested
inside Trinity as a submodule.

In a standalone clone the file is absent, and with `ots` installed the test
reports `available:true` over an unreadable proof and fails. A test suite that
passes only in one of its two legitimate checkouts is not a test suite; MYC must
work standalone, which is the whole reason the ActionIntent contract lives here
rather than in Trinity.

So the fixture is vendored, and pinned rather than merely copied:

| file | sha256 |
| --- | --- |
| `spore-bootstrap-v0.root` | `8c9b98451de989661796ea6392da8c4c1b05d28559d78618abe0880bd7d0b9fb` |
| `spore-bootstrap-v0.root.ots` | `5eb5a18d3b365d8179111a2fc9a7b8648f8b30d0accdcdbc133e9d469eec80d3` |

The first digest is also the `subject_digest` the proof commits to and the value
the adapter test asserts when `ots` is available — so the fixture is
self-consistent.

**These digests are checked, not just recorded.**
`ots fixture — each vendored file matches its pinned digest` in
`src/x2F80_ots_adapter_test.ts` computes both and asserts them independently, so
a failure names which file moved. A mutation control sits beside it and flips one
bit of each file to prove the check discriminates.

An earlier version of this file recorded the digests here and nowhere else, and
claimed a swapped file would fail loudly. That was false: replacing the root with
64 zeroes left every test green, because nothing opened it. A digest a reader can
see and a runner cannot check is documentation, and documentation is not a pin.

**Provenance:** copied byte-for-byte from Trinity
`probes/spore-bootstrap-pin-v0/external/`. These are the same bytes, not a
regenerated proof: an OpenTimestamps attestation cannot be re-minted without
changing what it attests.

**This is a test fixture and nothing else.** It is not evidence of anything about
MYC. It anchors a Trinity probe's bootstrap root, and it lives here only so a
standalone `deno task check` can exercise the adapter against a real proof.
