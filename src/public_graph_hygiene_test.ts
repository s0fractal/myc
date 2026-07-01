// Falsifier for audit A7: the PUBLIC graph (what a stranger resolves) must never
// contain the empty-content footgun (sha256("") = e3b0c44298fc…) nor known test
// fixtures. captureText already rejects empty content at the source; this guards
// the projections so fossils can't ship.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const EMPTY_CONTENT = "e3b0c44298fc"; // first 12 hex of sha256("")
const FIXTURE = "abcdef123456"; // the fake witness fixture

for (
  const rel of ["public/index.ndjson", "sites/myc.md/snapshot.gen.json"]
) {
  Deno.test(`A7: ${rel} carries no empty-content / fixture records`, () => {
    let text = "";
    try {
      text = Deno.readTextFileSync(rel);
    } catch {
      return; // absent projection is not this test's concern
    }
    assert(
      !text.includes(EMPTY_CONTENT),
      `${rel} contains the empty-content sha256("") footgun (${EMPTY_CONTENT})`,
    );
    assert(
      !text.includes(FIXTURE),
      `${rel} contains the test fixture ${FIXTURE}`,
    );
  });
}
