import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const env = await readFile(".env.example", "utf8");
for (const key of ["VITE_MICROSOFT_CLIENT_ID", "VITE_REDIRECT_URI"]) {
  const line = env.split(/\r?\n/).find((x) => x.startsWith(`${key}=`));
  assert.equal(line, `${key}=`, `${key} debe quedar vacío en la plantilla.`);
}
const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(pkg.license, "MIT");
assert.ok(
  !pkg.author && !pkg.homepage && !pkg.repository,
  "No incluir datos de una cuenta en package.json.",
);
let files;
try {
  const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (path.resolve(gitRoot) === root) {
    files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
  }
} catch {}
if (!files) {
  const skip = new Set([
    ".git",
    "node_modules",
    "dist",
    "coverage",
    "test-results",
    "playwright-report",
  ]);
  async function walk(dir = "") {
    const found = [];
    for (const entry of await readdir(path.join(root, dir), {
      withFileTypes: true,
    })) {
      if (skip.has(entry.name)) continue;
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) found.push(...(await walk(file)));
      else found.push(file);
    }
    return found;
  }
  files = await walk();
}
assert.ok(files.length > 0, "No se encontraron archivos para comprobar.");
for (const file of files) {
  assert.ok(
    !file.split("/").some((p) => [".netlify", "private-data", "node_modules", "dist"].includes(p)),
    `Excluir datos locales: ${file}`,
  );
  assert.ok(
    !/(^|\/)\.env(?:\..*)?$/.test(file) || file === ".env.example",
    `Excluir entorno real: ${file}`,
  );
  assert.ok(
    !/\.(zip|log|pdf|jpe?g|heic)$/i.test(file),
    `Revisar artefacto ajeno a fuentes: ${file}`,
  );
}
console.log(
  `Plantilla: variables vacías y ${files.length} rutas revisadas. Revisa también contenido e historial antes de publicar.`,
);
