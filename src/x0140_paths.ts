// MYC checkout/path policy. Keeping this authority boundary small makes pure
// descriptor modules usable without Deno environment or filesystem access.

export function joinPath(...parts: string[]): string {
  const filtered = parts.filter((part) => part.length > 0);
  if (filtered.length === 0) return ".";
  const first = filtered[0];
  const absolute = first.startsWith("/");
  const normalized = filtered
    .map((part, index) => {
      if (index === 0) return part.replace(/\/+$/g, "");
      return part.replace(/^\/+|\/+$/g, "");
    })
    .filter((part) => part.length > 0)
    .join("/");
  return absolute ? `/${normalized.replace(/^\/+/, "")}` : normalized;
}

export function defaultRoot(): string {
  const envRoot = Deno.env.get("MYC_ROOT");
  if (envRoot) return envRoot;
  const cwd = Deno.cwd();
  try {
    const config = Deno.statSync(joinPath(cwd, "deno.jsonc"));
    const entry = Deno.statSync(joinPath(cwd, "src", "x0100_myc.ts"));
    if (config.isFile && entry.isFile) return cwd;
  } catch {
    // Fall back to the local operator convention below.
  }
  const home = Deno.env.get("HOME") ?? Deno.cwd();
  const mycelium = joinPath(home, "trinity", "myc");
  const standalone = joinPath(home, "myc");
  try {
    if (Deno.statSync(mycelium).isDirectory) return mycelium;
  } catch { /* mycelium clone not present */ }
  try {
    if (Deno.statSync(standalone).isDirectory) return standalone;
  } catch { /* standalone clone not present */ }
  return mycelium;
}
