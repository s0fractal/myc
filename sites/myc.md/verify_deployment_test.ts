import { attestation, SERVED_ASSETS } from "./worker.ts";
import { evaluateDeployment } from "./verify_deployment.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("attestation is deterministic and covers every served asset", async () => {
  const a = await attestation();
  const b = await attestation();
  assert(a.digest === b.digest, "attestation digest is deterministic");
  assert(a.digest.startsWith("sha256:"), "digest is sha256");
  for (const path of Object.keys(SERVED_ASSETS)) {
    assert(
      typeof a.assets[path] === "string" &&
        a.assets[path].startsWith("sha256:"),
      `served asset ${path} is hashed`,
    );
  }
});

Deno.test("evaluateDeployment: VERIFIED only when deployed == attested == local", async () => {
  const local = await attestation();

  // byte-identical deploy that attests honestly → VERIFIED
  const served = { ...local.assets };
  assert(
    evaluateDeployment(local, local, served).verdict === "VERIFIED",
    "an identical, honest deploy verifies",
  );

  // a single tampered served asset → MISMATCH (the whole point)
  const path = Object.keys(local.assets)[0];
  const tampered = { ...served, [path]: "sha256:deadbeef" };
  const bad = evaluateDeployment(local, local, tampered);
  assert(bad.verdict === "MISMATCH", "a tampered served asset is caught");
  assert(
    bad.deployed_matches_local_source === false,
    "mismatch is flagged on the local-source comparison",
  );

  // a LYING server (serves tampered, attests the same, even forges the digest)
  // still cannot pass — we recompute from served bytes and compare to LOCAL.
  const lyingClaim = { digest: local.digest, assets: tampered };
  const lied = evaluateDeployment(local, lyingClaim, tampered);
  assert(lied.verdict === "MISMATCH", "a lying attestation cannot pass");

  // an unreachable asset is not silently a pass
  const missing = { ...served, [path]: "unreachable" };
  assert(
    evaluateDeployment(local, local, missing).verdict === "MISMATCH",
    "an unreachable asset is a mismatch, not a pass",
  );
});
