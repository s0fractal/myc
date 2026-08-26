import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CANONICAL_ENCODING,
  canonicalIntentBytes,
  canonicalIntentText,
  intentCommitment,
  NUMERIC_PROFILE,
  parseActionIntentBytes,
  unpairedSurrogateIndex,
  validateIntent,
} from "./x5820_action_intent.ts";

// SHARED PARITY VECTOR — Trinity x5E10 pins the same value (warrant_test.ts). If
// either side's algorithm drifts, exactly one of these tests fails. This is the
// cross-substrate parity guard, with no cross-substrate import.
const VECTOR = {
  verb: "apply",
  target_substrate: "myc" as const,
  args_commitment: "c1",
  input_commitments: ["a", "b"],
  requested_effects: ["receipt", "write"],
};
// The CANONICAL BYTES are pinned, not only their digest. Two implementations
// that agree on a wrong encoding produce one matching digest and no evidence;
// the bytes say which encoding either of them actually produced.
const EXPECTED_CANONICAL =
  '{"args_commitment":"c1","canonical_encoding":"hsp-jcs@v0",' +
  '"input_commitments":["a","b"],"numeric_profile":"cnp-0",' +
  '"requested_effects":["receipt","write"],"target_substrate":"myc",' +
  '"verb":"apply"}';
const EXPECTED =
  "ccc26b8b460fe2debf0ad069d55ec170a78b7b70861f1f54c03e401e4576c3be";

// The value this replaced, kept as a NEGATIVE control. There is no dual-hash
// path and no persisted commitment used it; a test asserting it is gone is
// cheaper than a comment saying so.
const SUPERSEDED =
  "d02d75adca7e0dbbd10244c7ea1e9aeafa7b6d019a0f570bcad471a38d997552";

Deno.test("x5820 action_intent — canonical BYTES match the shared vector", async () => {
  assertEquals(canonicalIntentText(VECTOR), EXPECTED_CANONICAL);
  assertEquals(
    new TextDecoder().decode(canonicalIntentBytes(VECTOR)),
    EXPECTED_CANONICAL,
  );
  assertEquals(await intentCommitment(VECTOR), EXPECTED);
});

Deno.test("x5820 action_intent — the root carries both profile identifiers", async () => {
  // RFC-0003 §5.1.2.1: a numeric profile without a wire encoding does not
  // determine a digest. Removing either changes the commitment, which is the
  // point of putting them inside the hashed root rather than beside it.
  const text = canonicalIntentText(VECTOR);
  assert(text.includes(`"canonical_encoding":"${CANONICAL_ENCODING}"`), text);
  assert(text.includes(`"numeric_profile":"${NUMERIC_PROFILE}"`), text);
  assert(await intentCommitment(VECTOR) !== SUPERSEDED);
});

Deno.test("x5820 action_intent — the superseded digest is not produced", async () => {
  // Nothing accepts the pre-adoption value for this intent. If this ever passes,
  // a dual-hash path was added that nobody agreed to.
  assert(await intentCommitment(VECTOR) !== SUPERSEDED);
});

Deno.test("x5820 action_intent — BMP and non-BMP strings survive; lone surrogates do not", async () => {
  // BMP: ordinary multi-byte scalars.
  const bmp = { ...VECTOR, verb: "застосувати" };
  assert(validateIntent(bmp).ok);
  assertEquals(canonicalIntentText(bmp).includes("застосувати"), true);
  assert((await intentCommitment(bmp)).length === 64);

  // Non-BMP: a surrogate PAIR is one scalar and is legal. This is the case the
  // Warrant/Myc parity vector never exercised, and the one where RFC 8785's
  // UTF-16 member ordering diverges from code-point ordering.
  const astral = { ...VECTOR, args_commitment: "𝄞-clef-😀" };
  assert(validateIntent(astral).ok);
  assertEquals(unpairedSurrogateIndex("𝄞-clef-😀"), -1);
  assert((await intentCommitment(astral)).length === 64);
  assert(await intentCommitment(astral) !== await intentCommitment(VECTOR));

  // Lone surrogate: rejected at the boundary, in every string position.
  const lone = "x\uD834y";
  assertEquals(unpairedSurrogateIndex(lone), 1);
  assertEquals(unpairedSurrogateIndex("\uDD1E"), 0); // low half, no high half
  for (
    const bad of [
      { ...VECTOR, verb: lone },
      { ...VECTOR, args_commitment: lone },
      { ...VECTOR, input_commitments: ["a", lone] },
      { ...VECTOR, requested_effects: [lone] },
    ]
  ) {
    const r = validateIntent(bad);
    assert(!r.ok, "an unpaired surrogate was admitted");
    if (!r.ok) assert(r.error.includes("unpaired UTF-16 surrogate"), r.error);
  }
});

Deno.test("x5820 action_intent — requested_effects is a SET: duplicates are canonicalised away", async () => {
  // Sorting alone is not set semantics. ["write","write"] and ["write"] request
  // the same effect; producing two commitments for them would let an authority
  // grant depend on how many times a caller named an effect.
  assertEquals(
    await intentCommitment({
      ...VECTOR,
      requested_effects: ["write", "write", "receipt", "receipt"],
    }),
    EXPECTED,
  );
  assertEquals(
    await intentCommitment({
      ...VECTOR,
      requested_effects: ["write", "receipt", "write"],
    }),
    EXPECTED,
  );
  // Duplicates are canonicalised, NOT rejected: a repeated effect is the same
  // ask written twice, not a malformed ask.
  assert(
    validateIntent({ ...VECTOR, requested_effects: ["write", "write"] }).ok,
  );
  // And a genuinely different SET is still a different commitment.
  assert(
    await intentCommitment({ ...VECTOR, requested_effects: ["write"] }) !==
      EXPECTED,
  );
});

Deno.test("x5820 action_intent — the encoder is unreachable for anything validateIntent refuses", async () => {
  // DIRECT-BYPASS controls. The encoder is exported, so it can be called without
  // the boundary — and it used to encode `requested_effects: [1]` as the JSON
  // number 1 and hand back a digest, while describing itself as "refusing
  // anything else". Both now run the one shared domain check.
  const cases: [string, unknown][] = [
    ["wrong array member type", { ...VECTOR, requested_effects: [1] }],
    ["wrong array member type (inputs)", {
      ...VECTOR,
      input_commitments: ["a", null],
    }],
    ["invalid substrate", { ...VECTOR, target_substrate: "mars" }],
    ["empty verb", { ...VECTOR, verb: "" }],
    ["whitespace verb", { ...VECTOR, verb: "   " }],
    ["malformed array field", { ...VECTOR, input_commitments: "a,b" }],
    ["extra member", { ...VECTOR, surprise: "silently dropped before" }],
    ["missing member", {
      verb: "a",
      target_substrate: "myc",
      args_commitment: "c",
      input_commitments: [],
    }],
    ["not an object", "intent"],
    ["array", [1, 2]],
    ["null", null],
    ["lone surrogate", { ...VECTOR, verb: "x\uD834y" }],
  ];
  for (const [name, bad] of cases) {
    assert(!validateIntent(bad).ok, `${name}: validateIntent admitted it`);

    let threw = false;
    try {
      canonicalIntentText(bad as never);
    } catch (e) {
      threw = e instanceof RangeError;
    }
    assert(threw, `${name}: the encoder produced canonical text`);

    let digestThrew = false;
    try {
      await intentCommitment(bad as never);
    } catch (e) {
      digestThrew = e instanceof RangeError;
    }
    assert(digestThrew, `${name}: a digest was produced`);
  }
});

Deno.test("x5820 action_intent — an unknown member is rejected, not dropped", () => {
  // Dropping it silently means two callers commit to one digest while believing
  // they asked for different things.
  const r = validateIntent({ ...VECTOR, extra_authority: "escalate" });
  assert(!r.ok);
  if (!r.ok) {
    assert(r.error.includes("unknown member"), r.error);
    assert(r.error.includes("extra_authority"), r.error);
  }
});

Deno.test("x5820 action_intent - a changing getter cannot reach canonical bytes", async () => {
  // Check-then-reread: the validator and the encoder each read the caller's
  // properties, so an accessor could answer one and then the other. That
  // produced canonical bytes containing the JSON number 1, and a digest over
  // them. Normalization now happens ONCE and encoding uses only the snapshot.
  const mk = (badFrom: number) => {
    let reads = 0;
    const evil: Record<string, unknown> = {
      verb: "apply",
      target_substrate: "myc",
      args_commitment: "c1",
      input_commitments: ["a"],
    };
    Object.defineProperty(evil, "requested_effects", {
      enumerable: true,
      get() {
        reads++;
        return reads >= badFrom ? [1] : ["write"];
      },
    });
    return evil;
  };

  // Invalid from the FIRST read: refused at the boundary.
  assert(!validateIntent(mk(1)).ok);

  // Invalid from the SECOND read: the boundary said yes, so the encoder is the
  // only thing standing between the caller and a digest.
  const late = mk(2);
  assert(validateIntent(late).ok, "the first read was supposed to be valid");
  let refused = false;
  try {
    canonicalIntentText(late as never);
  } catch (e) {
    refused = e instanceof RangeError;
  }
  assert(refused, "the encoder used a value the check never saw");

  // Whatever a getter does, no digest is ever produced over a non-string
  // effect, and no canonical text ever contains one.
  for (const from of [1, 2, 3, 4]) {
    const v = mk(from);
    let text = "";
    try {
      text = canonicalIntentText(v as never);
    } catch { /* refusing is the other correct answer */ }
    assert(!text.includes("[1]"), `canonical text carried a number: ${text}`);
    let digest = "";
    try {
      digest = await intentCommitment(mk(from) as never);
    } catch { /* refused */ }
    if (digest) {
      assertEquals(
        digest,
        await intentCommitment({
          verb: "apply",
          target_substrate: "myc",
          args_commitment: "c1",
          input_commitments: ["a"],
          requested_effects: ["write"],
        }),
        "a digest was produced that does not match any validated value",
      );
    }
  }
});

Deno.test("x5820 action_intent - raw bytes: duplicate member names are refused", () => {
  // JSON.parse keeps the last one and the other becomes invisible; a proposal
  // was written for an intent that also said "deny".
  const enc = (s: string) => new TextEncoder().encode(s);
  const dup = enc(
    '{"verb":"deny","verb":"apply","target_substrate":"myc",' +
      '"args_commitment":"c1","input_commitments":["a"],' +
      '"requested_effects":["write"]}',
  );
  const r = parseActionIntentBytes(dup);
  assert(!r.ok);
  if (!r.ok) assert(r.error.includes("duplicate-member-name"), r.error);

  // Escape-equivalent spelling: names are decoded before they are compared.
  const esc = enc(
    '{"verb":"deny","ve\\u0072b":"apply","target_substrate":"myc",' +
      '"args_commitment":"c1","input_commitments":["a"],' +
      '"requested_effects":["write"]}',
  );
  const r2 = parseActionIntentBytes(esc);
  assert(!r2.ok, "an escaped duplicate name was admitted");
  if (!r2.ok) assert(r2.error.includes("duplicate-member-name"), r2.error);

  // A well-formed intent still parses, so the scanner is not simply refusing.
  const good = parseActionIntentBytes(enc(JSON.stringify(VECTOR)));
  assert(good.ok, good.ok ? "" : good.error);
});

Deno.test("x5820 action_intent - raw bytes: invalid UTF-8 is refused, not replaced", () => {
  // A permissive decode turns 0xff into U+FFFD and commits to a character
  // nobody wrote.
  const bad = new Uint8Array([
    ...new TextEncoder().encode('{"verb":"ap'),
    0xff,
    ...new TextEncoder().encode(
      'ly","target_substrate":"myc","args_commitment":"c1",' +
        '"input_commitments":["a"],"requested_effects":["write"]}',
    ),
  ]);
  const r = parseActionIntentBytes(bad);
  assert(!r.ok);
  if (!r.ok) assert(r.error.includes("invalid-utf8"), r.error);
});
