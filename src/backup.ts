import JSZip from "jszip";
import { allFiles, validateData, type Data } from "./domain";
import { photoBlob } from "./photos";
import type { Store } from "./storage";
async function sha(blob: Blob) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function exportBackup(store: Store, data: Data): Promise<Blob> {
  const zip = new JSZip();
  const entries: Record<
    string,
    { path: string; mime: string; sha256: string }
  > = {};
  const files = allFiles(data);
  let total = 0;
  for (let i = 0; i < files.length; i++) {
    const blob = await photoBlob(store, files[i]);
    total += blob.size;
    if (total > 250 * 1024 * 1024)
      throw Error(
        "El respaldo supera 250 MiB. Exporta también la carpeta Apps desde OneDrive para armarios grandes.",
      );
    const path = `fotos/${i}.bin`;
    zip.file(path, await blob.arrayBuffer());
    const photo = [...data.garments, ...data.outfits]
      .flatMap((x) => x.photos)
      .find((p) => p.original === files[i] || p.processed === files[i]);
    const signature = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const detected =
      signature[0] === 137 && signature[1] === 80
        ? "image/png"
        : signature[0] === 255 && signature[1] === 216
          ? "image/jpeg"
          : String.fromCharCode(...signature.slice(8, 12)) === "WEBP"
            ? "image/webp"
            : "";
    const mime =
      detected ||
      (["image/jpeg", "image/png", "image/webp"].includes(blob.type)
        ? blob.type
        : photo?.original === files[i]
          ? photo.mime
          : files[i].endsWith(".webp")
            ? "image/webp"
            : "image/png");
    entries[files[i]] = { path, mime, sha256: await sha(blob) };
  }
  zip.file(
    "armario.json",
    JSON.stringify(
      {
        format: "armario-digital",
        version: 1,
        exportedAt: new Date().toISOString(),
        data,
        files: entries,
      },
      null,
      2,
    ),
  );
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
export async function importBackup(store: Store, file: File): Promise<Data> {
  if (file.size > 260 * 1024 * 1024) throw Error("El respaldo excede 260 MiB.");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const metadata = zip.file("armario.json");
  if (!metadata) throw Error("Respaldo sin armario.json.");
  // Inspect declared ZIP sizes before allocating decompressed buffers.
  const entries = Object.values(zip.files) as (JSZip.JSZipObject & {
    _data?: { uncompressedSize?: number };
  })[];
  if (entries.length > 50000) throw Error("Demasiados archivos en respaldo.");
  let declared = 0;
  for (const entry of entries) {
    const size = entry._data?.uncompressedSize || 0;
    declared += size;
    if (size > 20 * 1024 * 1024 || declared > 270 * 1024 * 1024)
      throw Error("Respaldo descomprimido demasiado grande.");
  }
  const raw = await metadata.async("string");
  if (raw.length > 20_000_000) throw Error("JSON demasiado grande.");
  const manifest = JSON.parse(raw);
  if (manifest.format !== "armario-digital" || manifest.version !== 1)
    throw Error("Formato de respaldo no compatible.");
  const data = validateData(manifest.data);
  const keys = allFiles(data);
  let total = 0;
  const blobs = new Map<string, Blob>();
  for (const key of keys) {
    const meta = manifest.files?.[key];
    if (
      !meta ||
      !/^fotos\/\d+\.bin$/.test(meta.path) ||
      !["image/jpeg", "image/png", "image/webp"].includes(meta.mime)
    )
      throw Error("Archivo de foto no válido en respaldo.");
    const entry = zip.file(meta.path);
    if (!entry) throw Error("Respaldo incompleto: falta una foto.");
    const array = await entry.async("uint8array");
    total += array.length;
    if (total > 250 * 1024 * 1024)
      throw Error("Respaldo descomprimido demasiado grande.");
    if (array.length > 20 * 1024 * 1024) throw Error("Una foto excede 20 MiB.");
    const blob = new Blob([new Uint8Array(array)], { type: meta.mime });
    if ((await sha(blob)) !== meta.sha256)
      throw Error("Foto alterada o corrupta en respaldo.");
    blobs.set(key, blob);
  }
  const mapping = new Map<string, string>();
  for (const [key, blob] of blobs)
    mapping.set(key, await store.putPhoto(blob, "respaldos/restauradas"));
  for (const item of [...data.garments, ...data.outfits])
    for (const p of item.photos) {
      p.original = mapping.get(p.original)!;
      if (p.processed) p.processed = mapping.get(p.processed)!;
    }
  return data;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
