import {
  defaultRoot as defaultFromFacade,
  joinPath as joinFromFacade,
} from "./x0100_myc.ts";
import { defaultRoot, joinPath } from "./x0140_paths.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("x0100 keeps path policy as a compatibility façade", () => {
  assert(defaultFromFacade === defaultRoot, "defaultRoot binding drifted");
  assert(joinFromFacade === joinPath, "joinPath binding drifted");
});

Deno.test("joinPath preserves the established portable path contract", () => {
  assert(joinPath() === ".", "empty path drifted");
  assert(
    joinPath("/tmp/", "/myc/", "public") === "/tmp/myc/public",
    "absolute path drifted",
  );
  assert(
    joinPath("root/", "/nested/") === "root/nested",
    "relative path drifted",
  );
});

Deno.test("defaultRoot honors the explicit MYC_ROOT boundary", () => {
  const previous = Deno.env.get("MYC_ROOT");
  try {
    Deno.env.set("MYC_ROOT", "/explicit/myc-root");
    assert(defaultRoot() === "/explicit/myc-root", "MYC_ROOT was ignored");
  } finally {
    if (previous === undefined) Deno.env.delete("MYC_ROOT");
    else Deno.env.set("MYC_ROOT", previous);
  }
});
