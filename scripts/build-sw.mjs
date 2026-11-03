import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
import { writeRules } from "./netlify-rules.mjs";
await writeRules();
async function files(dir, prefix = "") {
  const result = [];
  for (const f of await readdir(dir, { withFileTypes: true })) {
    if (f.isDirectory())
      result.push(...(await files(`${dir}/${f.name}`, `${prefix}${f.name}/`)));
    else if (
      /\.(js|css|html|svg|png|webmanifest)$/.test(f.name) &&
      f.name !== "sw.js" &&
      f.name !== "redirect.html"
    )
      result.push("/" + prefix + f.name);
  }
  return result;
}
const paths = (await files("dist")).sort();
const hash = createHash("sha256");
for (const path of paths) hash.update(await readFile("dist" + path));
const version = hash.digest("hex").slice(0, 16);
const worker = `/* Generated: only own static shell, never Graph, tokens, or private photos. */
const CACHE='armario-shell-${version}';
const ASSETS=${JSON.stringify(paths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('armario-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/redirect.html')return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(c=>c.match('/index.html'))));return;}
 if(ASSETS.includes(url.pathname)&&!url.search)event.respondWith(caches.open(CACHE).then(cache=>cache.match(request).then(hit=>hit||fetch(request))));
});
`;
new Script(worker);
await writeFile("dist/sw.js", worker);
console.log(`PWA: ${paths.length} recursos estáticos, versión ${version}.`);
