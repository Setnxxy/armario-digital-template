import type { Photo, Data } from "./domain";
import { allPhotos, uuid } from "./domain";
import type { Store } from "./storage";
const drafts = new Map<string, Blob>();
export const LIMIT = 20 * 1024 * 1024;
export async function inspectImage(blob: Blob) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type))
    throw Error(
      "Usa una foto JPG, PNG o WebP. Convierte HEIC antes de subirla.",
    );
  if (blob.size > LIMIT) throw Error("Cada foto puede ocupar hasta 20 MiB.");
  const bitmap = await createImageBitmap(blob);
  const result = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (result.width * result.height > 40_000_000)
    throw Error("La imagen supera 40 megapíxeles. Usa una copia más pequeña.");
  return result;
}
export async function addPhoto(file: File): Promise<Photo> {
  const size = await inspectImage(file);
  const key = "draft:" + uuid();
  drafts.set(key, file);
  return {
    id: uuid(),
    original: key,
    name: file.name,
    mime: file.type as Photo["mime"],
    ...size,
  };
}
export async function addProcessed(file: File): Promise<string> {
  if (!["image/png", "image/webp"].includes(file.type))
    throw Error("El recorte debe ser PNG o WebP, con transparencia.");
  await inspectImage(file);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(bitmap.width, 512);
  canvas.height = Math.min(bitmap.height, 512);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let alpha = false;
  for (let i = 3; i < pixels.length; i += 4)
    if (pixels[i] < 250) {
      alpha = true;
      break;
    }
  if (!alpha)
    throw Error(
      "No se detectó transparencia. Exporta el recorte con fondo transparente.",
    );
  const key = "draft:" + uuid();
  drafts.set(key, file);
  return key;
}
export async function photoBlob(store: Store, key: string) {
  const blob = drafts.get(key);
  return blob || store.getPhoto(key);
}
export async function persistPhotos(store: Store, data: Data): Promise<Data> {
  const d = structuredClone(data),
    mapping = new Map<string, string>();
  for (const entity of [...d.garments, ...d.outfits])
    for (const p of entity.photos) {
      for (const prop of ["original", "processed"] as const) {
        const key = p[prop];
        if (!key?.startsWith("draft:")) continue;
        if (!mapping.has(key)) {
          const blob = drafts.get(key);
          if (!blob)
            throw Error(
              "No se encuentra la foto del formulario. Vuelve a seleccionarla.",
            );
          const area = d.garments.some((g) => g.id === entity.id)
            ? `prendas/${prop === "original" ? "originales" : "procesadas"}`
            : "outfits/fotos";
          mapping.set(key, await store.putPhoto(blob, area));
        }
        p[prop] = mapping.get(key)!;
      }
    }
  return d;
}
export function discardDrafts() {
  drafts.clear();
}
export const photoKeys = (data: Data) =>
  allPhotos(data).flatMap((p) => [
    p.original,
    ...(p.processed ? [p.processed] : []),
  ]);
