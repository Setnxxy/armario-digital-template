import { token } from "./auth";
import {
  RevisionSchema,
  validateData,
  type Revision,
  uuid,
  emptyData,
  now,
  heads,
} from "./domain";
import type { Store } from "./storage";
const BASE = "https://graph.microsoft.com/v1.0";
type Item = {
  id: string;
  name: string;
  eTag?: string;
  file?: unknown;
  folder?: unknown;
  "@microsoft.graph.downloadUrl"?: string;
};
export class GraphError extends Error {
  constructor(public status: number) {
    super(
      status === 403
        ? "OneDrive rechazó la operación con AppFolder (403). No se ampliaron permisos."
        : status === 401
          ? "La sesión de Microsoft expiró. Inicia sesión de nuevo."
          : status === 429
            ? "OneDrive está limitando las solicitudes. Espera y vuelve a intentar."
            : `OneDrive no completó la operación (HTTP ${status}).`,
    );
  }
}
export class GraphStore implements Store {
  kind = "cloud" as const;
  root = "";
  folders = new Map<string, string>();
  async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!navigator.onLine)
      throw Error("Sin conexión. No se guardó en OneDrive.");
    if (path.startsWith("https:") && !path.startsWith(BASE + "/"))
      throw Error("URL Graph no permitida.");
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await token()}`);
    const r = await fetch(path.startsWith(BASE) ? path : BASE + path, {
      ...init,
      headers,
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    if (!r.ok) throw new GraphError(r.status);
    return r;
  }
  async json<T>(path: string, init?: RequestInit): Promise<T> {
    return (await this.request(path, init)).json();
  }
  async init() {
    const root = await this.json<Item>("/me/drive/special/approot");
    this.root = root.id;
    this.folders.set("", root.id);
    return this;
  }
  async children(id: string): Promise<Item[]> {
    let path = `/me/drive/items/${encodeURIComponent(id)}/children`;
    const items: Item[] = [];
    while (path) {
      const page = await this.json<{
        value: Item[];
        "@odata.nextLink"?: string;
      }>(path);
      items.push(...page.value);
      path = page["@odata.nextLink"] || "";
    }
    return items;
  }
  async folder(path: string): Promise<string> {
    if (this.folders.has(path)) return this.folders.get(path)!;
    const parts = path.split("/");
    const name = parts.pop()!;
    const parent = await this.folder(parts.join("/"));
    let item = (await this.children(parent)).find(
      (x) => x.name === name && x.folder,
    );
    if (!item) {
      try {
        item = await this.json<Item>(
          `/me/drive/items/${encodeURIComponent(parent)}/children`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              folder: {},
              "@microsoft.graph.conflictBehavior": "fail",
            }),
          },
        );
      } catch (e) {
        if (!(e instanceof GraphError) || e.status !== 409) throw e;
        item = (await this.children(parent)).find(
          (x) => x.name === name && x.folder,
        );
        if (!item) throw e;
      }
    }
    this.folders.set(path, item.id);
    return item.id;
  }
  async upload(parent: string, name: string, body: Blob) {
    return this.json<Item>(
      `/me/drive/items/${encodeURIComponent(parent)}:/${encodeURIComponent(name)}:/content`,
      {
        method: "PUT",
        headers: { "Content-Type": body.type || "application/octet-stream" },
        body,
      },
    );
  }
  async download(item: Item): Promise<Blob> {
    let url = item["@microsoft.graph.downloadUrl"];
    if (!url) {
      const meta = await this.json<Item>(
        `/me/drive/items/${encodeURIComponent(item.id)}`,
      );
      url = meta["@microsoft.graph.downloadUrl"];
    }
    if (!url || new URL(url).protocol !== "https:")
      throw Error("OneDrive no devolvió enlace de descarga seguro.");
    let r: Response;
    try {
      r = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
    } catch {
      // Never expose the preauthenticated path or query in an error.
      throw Error(
        `No se pudo descargar desde ${new URL(url).hostname}. Comprueba la conexión y si el navegador bloqueó ese destino.`,
      );
    }
    if (!r.ok)
      throw Error(
        "No se pudo descargar el archivo. Actualiza para renovar el enlace.",
      );
    return r.blob();
  }
  async list(): Promise<Revision[]> {
    const folder = await this.folder("datos/revisiones");
    const items = (await this.children(folder)).filter(
      (x) => x.file && x.name.endsWith(".json"),
    );
    const result: Revision[] = [];
    for (const item of items) {
      const r = RevisionSchema.parse(
        JSON.parse(await (await this.download(item)).text()),
      );
      if (item.name !== `${r.id}.json`)
        throw Error(
          "Identidad de revisión no válida. No se modificó el armario.",
        );
      validateData(r.data);
      result.push(r);
    }
    return result;
  }
  async append(r: Revision) {
    const folder = await this.folder("datos/revisiones");
    const body = new Blob([JSON.stringify(r)], { type: "application/json" });
    try {
      await this.upload(folder, `${r.id}.json`, body);
    } catch (e) {
      // Ambiguous network failure: confirm own immutable UUID, never republish under a fresh ID.
      const found = (await this.children(folder)).find(
        (x) => x.name === `${r.id}.json`,
      );
      if (
        !found ||
        (await (await this.download(found)).text()) !== (await body.text())
      )
        throw e;
    }
  }
  async putPhoto(blob: Blob, area: string) {
    const parent = await this.folder(area);
    return (
      await this.upload(
        parent,
        `${uuid()}.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`,
        blob,
      )
    ).id;
  }
  async getPhoto(key: string) {
    return this.download({ id: key, name: "" });
  }
  async diagnose(): Promise<string[]> {
    const results: string[] = [];
    let stage = "preparar carpeta de diagnóstico";
    try {
      const folder = await this.folder(`diagnostico/${uuid()}`);
      const body = new Blob([JSON.stringify({ test: 1 })], {
        type: "application/json",
      });
      stage = "crear JSON";
      const a = await this.upload(folder, "prueba.json", body);
      stage = "leer JSON";
      const read = JSON.parse(await (await this.download(a)).text());
      if (read.test !== 1) throw Error("La lectura no coincide.");
      results.push("JSON: creación y lectura verificadas.");
      stage = "actualizar JSON";
      const b = await this.json<Item>(
        `/me/drive/items/${encodeURIComponent(a.id)}/content`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: 2 }),
        },
      );
      stage = "releer JSON actualizado";
      if (JSON.parse(await (await this.download(b)).text()).test !== 2)
        throw Error("Actualización no verificable.");
      results.push(
        "JSON: actualización y relectura verificadas (archivo de diagnóstico).",
      );
      // PATCH, where If-Match is documented. Do not use this as a guarantee for PUT /content.
      stage = "comprobar PATCH con ETag";
      if (!b.eTag) throw Error("No hay eTag para ensayar precondición.");
      const c = await this.json<Item>(
        `/me/drive/items/${encodeURIComponent(a.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "If-Match": b.eTag },
          body: JSON.stringify({ name: "prueba-v2.json" }),
        },
      );
      if (!c.eTag) throw Error("PATCH no devolvió eTag.");
      let status = 0;
      try {
        await this.request(`/me/drive/items/${encodeURIComponent(a.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "If-Match": b.eTag },
          body: JSON.stringify({ name: "obsoleta.json" }),
        });
      } catch (e) {
        if (e instanceof GraphError) status = e.status;
        else throw e;
      }
      if (status !== 412)
        throw Error(
          `If-Match obsoleto no devolvió 412 (resultado ${status || "aceptado"}). No se considera validado.`,
        );
      results.push(
        "Dos clientes lógicos: PATCH obsoleto rechazado con 412. No prueba CAS de contenido.",
      );
      const png = Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        ),
        (c) => c.charCodeAt(0),
      );
      stage = "subir PNG";
      const photo = await this.upload(
        folder,
        "foto.png",
        new Blob([png], { type: "image/png" }),
      );
      stage = "leer PNG";
      if ((await this.download(photo)).size !== png.length)
        throw Error("La foto no coincide.");
      results.push("PNG: subida y lectura verificadas.");
      stage = "crear y recuperar revisiones simultáneas";
      const base: Revision = {
        id: uuid(),
        parents: [],
        device: "diagnostico-base",
        createdAt: now(),
        data: emptyData(),
      };
      const left = {
        ...base,
        id: uuid(),
        parents: [base.id],
        device: "cliente-A",
      };
      const right = {
        ...base,
        id: uuid(),
        parents: [base.id],
        device: "cliente-B",
      };
      await this.upload(
        folder,
        `${base.id}.json`,
        new Blob([JSON.stringify(base)]),
      );
      await Promise.all(
        [left, right].map((r) =>
          this.upload(folder, `${r.id}.json`, new Blob([JSON.stringify(r)])),
        ),
      );
      const revisions = [];
      for (const r of [base, left, right]) {
        const item = (await this.children(folder)).find(
          (x) => x.name === `${r.id}.json`,
        );
        if (!item)
          throw Error(
            "Creación simultánea aún no visible. Reintenta diagnóstico.",
          );
        revisions.push(
          RevisionSchema.parse(
            JSON.parse(await (await this.download(item)).text()),
          ),
        );
      }
      if (heads(revisions).length !== 2)
        throw Error("No se conservaron las dos ramas.");
      results.push(
        "Dos clientes lógicos: creaciones simultáneas preservadas; dos ramas detectadas.",
      );
      results.push(
        "Diagnóstico completo. Faltan dos navegadores/dispositivos reales para aceptación V1. Archivos conservados en diagnostico.",
      );
      return results;
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Error de conexión.";
      throw Error(`Diagnóstico detenido al ${stage}: ${detail}`);
    }
  }
}
