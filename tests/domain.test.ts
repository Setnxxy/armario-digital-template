import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  emptyData,
  heads,
  autoLayout,
  removeGarment,
  validateData,
  historyPush,
  movePiece,
  now,
  type Revision,
  type Data,
} from "../src/domain";
import { publish, ConflictError, type Store } from "../src/storage";
const r = (
  id: string,
  parents: string[] = [],
  data: Data = emptyData(),
): Revision => ({ id, parents, data, createdAt: now(), device: "test" });
class MemoryStore implements Store {
  kind = "demo" as const;
  records: Revision[] = [];
  failure = false;
  async list() {
    return structuredClone(this.records);
  }
  async append(revision: Revision) {
    if (this.failure) throw Error("network");
    this.records.push(structuredClone(revision));
  }
  async putPhoto() {
    return "photo";
  }
  async getPhoto() {
    return new Blob();
  }
}
beforeEach(() => {
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {} });
});
describe("Integridad y composición", () => {
  it("empieza con las diez categorías y tres estilos confirmados", () => {
    expect(emptyData().categories).toHaveLength(10);
    expect(emptyData().classifications.map((t) => t.name)).toEqual([
      "Formal",
      "Casual",
      "Deportivo",
    ]);
  });
  it("distribuye hasta 50 piezas en coordenadas relativas válidas", () => {
    for (let n = 1; n <= 50; n++) {
      const ps = autoLayout(Array.from({ length: n }, (_, i) => `${i}`));
      expect(ps).toHaveLength(n);
      for (const p of ps) {
        expect(p.x - p.w / 2).toBeGreaterThanOrEqual(0);
        expect(p.y - p.h / 2).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w / 2).toBeLessThanOrEqual(1);
        expect(p.y + p.h / 2).toBeLessThanOrEqual(1);
      }
    }
  });
  it("eliminar prenda limpia referencias sin borrar outfit ni fotos reales", () => {
    const d = emptyData();
    d.outfits = [
      {
        id: "o",
        name: "Look",
        classificationId: "type-1",
        pieces: autoLayout(["g"]),
        photos: [],
        notes: "",
        favorite: false,
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    const next = removeGarment(d, "g");
    expect(next.outfits).toHaveLength(1);
    expect(next.outfits[0].pieces).toEqual([]);
    expect(d.outfits[0].pieces).toHaveLength(1);
  });
  it("rechaza referencias rotas en respaldo", () => {
    const d = emptyData();
    d.outfits = [
      {
        id: "o",
        name: "Look",
        classificationId: "type-1",
        pieces: autoLayout(["missing"]),
        photos: [],
        notes: "",
        favorite: false,
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    expect(() => validateData(d)).toThrow("referencias rotas");
  });
  it("deshacer y nueva edición eliminan rama de rehacer; clona valores", () => {
    const a = autoLayout(["a"]);
    const b = autoLayout(["b"]);
    const v = historyPush([a, b], 0, a);
    expect(v.history).toHaveLength(2);
    a[0].x = 0.99;
    expect(v.history[1][0].x).toBe(0.5);
  });
  it("teclado/arrastre respetan límites de posición", () => {
    const p = autoLayout(["a"])[0];
    expect(movePiece(p, 9, -9)).toMatchObject({ x: 1, y: 0 });
  });
});
describe("Revisiones inmutables y concurrencia", () => {
  it("dos escrituras concurrentes conservan ambas cabezas, nunca elige la última", async () => {
    const s = new MemoryStore();
    s.records = [r("base")];
    let readers = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const normal = s.list.bind(s);
    s.list = async () => {
      const snapshot = await normal();
      readers++;
      if (readers <= 2) {
        if (readers === 2) release();
        await barrier;
      }
      return snapshot;
    };
    const a = emptyData(),
      b = emptyData();
    a.categories[0].name = "cliente A";
    b.categories[0].name = "cliente B";
    await Promise.all([publish(s, a, ["base"]), publish(s, b, ["base"])]);
    const h = heads(s.records);
    expect(h).toHaveLength(2);
    expect(h.map((v) => v.data.categories[0].name).sort()).toEqual([
      "cliente A",
      "cliente B",
    ]);
    expect(s.records).toHaveLength(3);
  });
  it("actualización obsoleta se rechaza antes de subir y conserva historial", async () => {
    const s = new MemoryStore();
    s.records = [r("base"), r("new", ["base"])];
    await expect(publish(s, emptyData(), ["base"])).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(s.records).toHaveLength(2);
  });
  it("resolución explícita reúne todas las cabezas; no elimina originales", async () => {
    const s = new MemoryStore();
    s.records = [r("base"), r("a", ["base"]), r("b", ["base"])];
    const h = await publish(s, emptyData(), ["a", "b"], true);
    expect(h).toHaveLength(1);
    expect(h[0].parents.sort()).toEqual(["a", "b"]);
    expect(s.records).toHaveLength(4);
  });
  it("una nueva rama durante resolución impide descartar silenciosamente", async () => {
    const s = new MemoryStore();
    s.records = [
      r("base"),
      r("a", ["base"]),
      r("b", ["base"]),
      r("c", ["base"]),
    ];
    await expect(
      publish(s, emptyData(), ["a", "b"], true),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(s.records).toHaveLength(4);
  });
  it("creaciones simultáneas desde armario vacío se preservan", async () => {
    const s = new MemoryStore();
    await Promise.all([
      publish(s, emptyData(), []),
      publish(s, emptyData(), []),
    ]);
    expect(heads(s.records)).toHaveLength(2);
  });
  it("error de subida nunca devuelve éxito ni modifica los registros", async () => {
    const s = new MemoryStore();
    s.failure = true;
    await expect(publish(s, emptyData(), [])).rejects.toThrow("network");
    expect(s.records).toEqual([]);
  });
  it("listado que tarda en mostrar la escritura incluye la revisión propia confirmada", async () => {
    const s = new MemoryStore();
    s.list = async () => [];
    const result = await publish(s, emptyData(), []);
    expect(result).toHaveLength(1);
    expect(s.records).toHaveLength(1);
  });
  it("historial incompleto no se interpreta como armario vacío", () => {
    expect(() => heads([r("child", ["missing"])])).toThrow("incompleto");
  });
});
it("rechaza IDs duplicados y ciclos del historial sin devolver vacío", () => {
  expect(() => heads([r("a"), r("a")])).toThrow("duplicados");
  expect(() => heads([r("a", ["b"]), r("b", ["a"])])).toThrow("cíclico");
});
