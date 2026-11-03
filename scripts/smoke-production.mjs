// Run after npm run build. Uses a local static server; does not test a Netlify deploy or Microsoft login.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { config, headersFor } from "./netlify-rules.mjs";
const rules = await config();
const root = resolve("dist"),
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    const full = join(root, path === "/" ? "index.html" : path);
    if (!full.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    const bytes = await readFile(full);
    res.writeHead(200, {
      "Content-Type": types[extname(full)] || "application/octet-stream",
      ...headersFor(rules, path),
    });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const manifest = await page.evaluate(async () => {
    const m = document.querySelector("link[rel=manifest]").href;
    return (await fetch(m)).json();
  });
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 2);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (k) =>
          (await (await caches.open(k)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
  });
  assert(cached.some((u) => u.endsWith("/index.html")));
  assert(!cached.some((u) => /graph.microsoft|redirect.html|blob:/.test(u)));
  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.src = "/redirect.html";
    iframe.title = "Prueba de puente";
    document.body.append(iframe);
  });
  await page
    .frameLocator("iframe")
    .getByText("No se pudo completar el inicio de sesión.", { exact: false })
    .waitFor();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("heading", { name: "Mi armario", exact: true })
    .waitFor();
  assert((await page.locator(".topbar").innerText()).includes("Sin conexión"));
  assert.deepEqual(errors, []);
  await context.setOffline(false);
  await page.goto(`http://127.0.0.1:${port}/redirect.html`);
  await page
    .getByText("No se pudo completar el inicio de sesión.", { exact: false })
    .waitFor();
  const frames = await page.evaluate(() => ({
    react: !!document.getElementById("root"),
    sw: navigator.serviceWorker.controller?.scriptURL,
  }));
  assert.equal(frames.react, false);
  console.log(
    "PASS producción: manifiesto, iconos, SW activo, shell offline, caché sin Graph/puente, puente aislado y sin errores JS. Instalación física/login no ensayados.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
