import { parse } from "smol-toml";
import { readFile, writeFile } from "node:fs/promises";
export async function config() {
  return parse(await readFile("netlify.toml", "utf8"));
}
export async function writeRules() {
  const c = await config();
  await writeFile(
    "dist/_headers",
    c.headers
      .map(
        (r) =>
          `${r.for}\n${Object.entries(r.values)
            .map(([key, value]) => `  ${key}: ${value}`)
            .join("\n")}`,
      )
      .join("\n\n") + "\n",
  );
  await writeFile(
    "dist/_redirects",
    c.redirects.map((r) => `${r.from} ${r.to} ${r.status}`).join("\n") + "\n",
  );
}
// Return complete matching rule with greatest literal specificity. Used only by local smoke server.
export function headersFor(c, path) {
  const candidates = c.headers
    .filter((r) => r.for === "/*" || r.for === path)
    .sort(
      (a, b) => a.for.replace("*", "").length - b.for.replace("*", "").length,
    );
  return candidates.at(-1)?.values || {};
}
