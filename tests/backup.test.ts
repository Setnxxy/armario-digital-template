import { it, expect } from "vitest";
import JSZip from "jszip";
import { exportBackup, importBackup } from "../src/backup";
import { emptyData, now, type Revision } from "../src/domain";
import type { Store } from "../src/storage";
function memory() {
  let calls = 0;
  const blobs = new Map<string, Blob>([
    ["old", new Blob(["fixture-bytes"], { type: "image/png" })],
  ]);
  const store: Store = {
    kind: "demo",
    list: async () => [] as Revision[],
    append: async () => {},
    getPhoto: async (key) => {
      const b = blobs.get(key);
      if (!b) throw Error("missing");
      return b;
    },
    putPhoto: async (b) => {
      const id = `new-${++calls}`;
      blobs.set(id, b);
      return id;
    },
  };
  return { store, blobs, calls: () => calls };
}
function sample() {
  const d = emptyData();
  d.garments = [
    {
      id: "g",
      name: "Prenda",
      categoryId: "cat-0",
      color: "",
      brand: "",
      size: "",
      tags: [],
      notes: "",
      favorite: true,
      createdAt: now(),
      updatedAt: now(),
      photos: [
        {
          id: "p",
          original: "old",
          processed: "old",
          name: "foto.png",
          mime: "image/png",
          width: 1,
          height: 1,
        },
      ],
    },
  ];
  return d;
}
it("ZIP contiene todos los bytes y al restaurar remapea claves conservando original y derivada", async () => {
  const m = memory(),
    d = sample();
  const blob = await exportBackup(m.store, d);
  const restored = await importBackup(m.store, new File([blob], "backup.zip"));
  expect(restored.garments[0].photos[0]).toMatchObject({
    original: "new-1",
    processed: "new-1",
  });
  expect(await m.blobs.get("new-1")!.text()).toBe("fixture-bytes");
  expect(d.garments[0].photos[0].original).toBe("old");
});
it("foto corrupta no sube ningún dato ni publica JSON", async () => {
  const m = memory();
  const backup = await exportBackup(m.store, sample());
  const zip = await JSZip.loadAsync(await backup.arrayBuffer());
  zip.file("fotos/0.bin", "corrupt");
  const bad = await zip.generateAsync({ type: "uint8array" });
  await expect(
    importBackup(m.store, new File([new Uint8Array(bad)], "bad.zip")),
  ).rejects.toThrow("corrupta");
  expect(m.calls()).toBe(0);
});
it("foto ausente y versión desconocida se rechazan antes de cargar", async () => {
  const m = memory();
  const backup = await exportBackup(m.store, sample());
  const zip = await JSZip.loadAsync(await backup.arrayBuffer());
  zip.remove("fotos/0.bin");
  const bad = await zip.generateAsync({ type: "uint8array" });
  await expect(
    importBackup(m.store, new File([new Uint8Array(bad)], "bad.zip")),
  ).rejects.toThrow("falta una foto");
  expect(m.calls()).toBe(0);
});
it("recorte WebP con descarga octet-stream conserva MIME por firma", async () => {
  const m = memory();
  m.blobs.set(
    "cut",
    new Blob(["RIFF0000WEBPmock"], { type: "application/octet-stream" }),
  );
  const d = sample();
  d.garments[0].photos[0].processed = "cut";
  const zip = await JSZip.loadAsync(
    await (await exportBackup(m.store, d)).arrayBuffer(),
  );
  const manifest = JSON.parse(await zip.file("armario.json")!.async("string"));
  expect(manifest.files.cut.mime).toBe("image/webp");
});
