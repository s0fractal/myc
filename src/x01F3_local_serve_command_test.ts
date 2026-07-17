import { parseServePort } from "./x01F3_local_serve_command.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("serve port defaults only when the flag is absent", () => {
  assert(parseServePort(undefined) === 8787, "default serve port drift");
  assert(parseServePort("1") === 1, "minimum serve port rejected");
  assert(parseServePort("65535") === 65535, "maximum serve port rejected");
});

Deno.test("serve port rejects ambiguous and out-of-range values", () => {
  for (
    const value of [
      true,
      "",
      " ",
      "0",
      "65536",
      "1.5",
      "1e3",
      "+80",
      "-1",
      "not-a-port",
    ]
  ) {
    let message = "";
    try {
      parseServePort(value);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assert(
      message === "serve --port must be a decimal integer from 1 to 65535",
      `invalid serve port ${JSON.stringify(value)} did not fail closed`,
    );
  }
});
