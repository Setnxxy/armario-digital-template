import { it, expect, vi, beforeEach } from "vitest";
vi.mock("../src/auth", () => ({
  token: async () => "test-bearer-never-logged",
}));
import { GraphStore, GraphError } from "../src/graph";
beforeEach(() => {
  vi.stubGlobal("navigator", { onLine: true });
});
it("paginación de archivos no pierde revisiones", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          value: [{ id: "a" }],
          "@odata.nextLink": "https://graph.microsoft.com/v1.0/page2",
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ value: [{ id: "b" }] })),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await new GraphStore().children("parent")).toEqual([
    { id: "a" },
    { id: "b" },
  ]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("rechaza enlace nextLink externo antes de enviar Authorization", async () => {
  vi.stubGlobal("fetch", vi.fn());
  await expect(
    new GraphStore().request("https://attacker.test/steal"),
  ).rejects.toThrow("no permitida");
  expect(fetch).not.toHaveBeenCalled();
});
it("sin red no envía ni finge éxito", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  vi.stubGlobal("fetch", vi.fn());
  await expect(
    new GraphStore().request("/me/drive/special/approot"),
  ).rejects.toThrow("Sin conexión");
  expect(fetch).not.toHaveBeenCalled();
});
it("403 AppFolder no amplía permisos ni reintenta", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("", { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  await expect(new GraphStore().init()).rejects.toBeInstanceOf(GraphError);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("descarga preautorizada sin token ni cookie; nunca /content con Bearer", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("photo"));
  vi.stubGlobal("fetch", fetch);
  await new GraphStore().download({
    id: "a",
    name: "test",
    "@microsoft.graph.downloadUrl": "https://abc.files.1drv.com/photo",
  });
  expect(fetch.mock.calls[0][1]).toEqual({
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
});
it("crear carpeta simultáneamente maneja 409 y recupera la misma carpeta", async () => {
  const s = new GraphStore();
  s.folders.set("", "root");
  s.children = vi
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "common", name: "datos", folder: {} }]);
  s.json = vi.fn().mockRejectedValue(new GraphError(409));
  expect(await s.folder("datos")).toBe("common");
});
it("un fallo de descarga identifica el destino sin revelar enlaces preautorizados", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  const error = await new GraphStore()
    .download({
      id: "a",
      name: "prueba",
      "@microsoft.graph.downloadUrl":
        "https://abc.files.1drv.com/private-path?tempauth=private-query",
    })
    .catch((e: Error) => e);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain("abc.files.1drv.com");
  expect((error as Error).message).not.toMatch(
    /private-path|private-query|tempauth/,
  );
});
it("el diagnóstico identifica la fase fallida sin confirmar éxito", async () => {
  const s = new GraphStore();
  s.folder = vi.fn().mockResolvedValue("diagnostico");
  s.upload = vi.fn().mockResolvedValue({ id: "a" });
  s.download = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(s.diagnose()).rejects.toThrow(
    "Diagnóstico detenido al leer JSON",
  );
});
it("subida JSON de resultado ambiguo verifica el mismo UUID sin crear otro", async () => {
  const s = new GraphStore();
  const r = {
    id: "revision",
    parents: [],
    device: "client",
    createdAt: new Date().toISOString(),
    data: (await import("../src/domain")).emptyData(),
  };
  s.folder = vi.fn().mockResolvedValue("folder");
  s.upload = vi.fn().mockRejectedValue(Error("connection-lost"));
  s.children = vi
    .fn()
    .mockResolvedValue([{ id: "item", name: "revision.json", file: {} }]);
  s.download = vi.fn().mockResolvedValue(new Blob([JSON.stringify(r)]));
  await s.append(r);
  expect(s.upload).toHaveBeenCalledTimes(1);
});
it("resultado ambiguo con bytes distintos jamás confirma éxito", async () => {
  const s = new GraphStore();
  const r = {
    id: "revision",
    parents: [],
    device: "client",
    createdAt: new Date().toISOString(),
    data: (await import("../src/domain")).emptyData(),
  };
  s.folder = vi.fn().mockResolvedValue("folder");
  s.upload = vi.fn().mockRejectedValue(Error("connection-lost"));
  s.children = vi
    .fn()
    .mockResolvedValue([{ id: "item", name: "revision.json", file: {} }]);
  s.download = vi.fn().mockResolvedValue(new Blob(["different"]));
  await expect(s.append(r)).rejects.toThrow("connection-lost");
});
