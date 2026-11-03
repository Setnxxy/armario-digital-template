import { z } from "zod";
const id = z.string().min(1).max(180);
const text = z.string().max(10000);
export const PhotoSchema = z.object({
  id,
  original: id,
  processed: id.optional(),
  name: text,
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  width: z.number().positive(),
  height: z.number().positive(),
});
export const PieceSchema = z.object({
  garmentId: id,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.05).max(1),
  h: z.number().min(0.05).max(1),
  rotation: z.number().min(-360).max(360),
  z: z.number().int(),
});
const common = {
  id,
  name: z.string().trim().min(1).max(120),
  notes: text,
  favorite: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const GarmentSchema = z.object({
  ...common,
  categoryId: id,
  photos: z.array(PhotoSchema).min(1).max(20),
  color: text,
  brand: text,
  size: text,
  tags: z.array(z.string().max(100)).max(50),
});
export const OutfitSchema = z.object({
  ...common,
  classificationId: id,
  pieces: z.array(PieceSchema).max(50),
  photos: z.array(PhotoSchema).max(20),
});
export const PreferencesSchema = z.object({
  theme: z.enum(["dark", "light", "auto"]),
  view: z.enum(["grid", "list"]),
  sort: z.enum(["date", "name", "category"]),
});
export const DataSchema = z.object({
  schemaVersion: z.literal(1),
  categories: z
    .array(z.object({ id, name: z.string().trim().min(1).max(120) }))
    .min(1)
    .max(300),
  classifications: z
    .array(z.object({ id, name: z.string().trim().min(1).max(120) }))
    .min(1)
    .max(300),
  garments: z.array(GarmentSchema).max(10000),
  outfits: z.array(OutfitSchema).max(10000),
  preferences: PreferencesSchema,
});
export const RevisionSchema = z.object({
  id,
  parents: z.array(id),
  createdAt: z.string().datetime(),
  device: id,
  data: DataSchema,
});
export type Photo = z.infer<typeof PhotoSchema>;
export type Piece = z.infer<typeof PieceSchema>;
export type Garment = z.infer<typeof GarmentSchema>;
export type Outfit = z.infer<typeof OutfitSchema>;
export type Data = z.infer<typeof DataSchema>;
export type Revision = z.infer<typeof RevisionSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const defaults: Preferences = {
  theme: "dark",
  view: "grid",
  sort: "date",
};
export function emptyData(): Data {
  return {
    schemaVersion: 1,
    categories: [
      "pantalones de mezclilla",
      "joggers",
      "playeras",
      "hoodies",
      "chamarras",
      "tenis",
      "zapatos",
      "camisas",
      "shorts",
      "accesorios",
    ].map((name, i) => ({ id: `cat-${i}`, name })),
    classifications: ["Formal", "Casual", "Deportivo"].map((name, i) => ({
      id: `type-${i}`,
      name,
    })),
    garments: [],
    outfits: [],
    preferences: { ...defaults },
  };
}
export function validateData(input: unknown): Data {
  const d = DataSchema.parse(input);
  for (const entries of [
    d.categories,
    d.classifications,
    d.garments,
    d.outfits,
  ])
    if (new Set(entries.map((x) => x.id)).size !== entries.length)
      throw Error("IDs duplicados en respaldo.");
  const cats = new Set(d.categories.map((c) => c.id)),
    types = new Set(d.classifications.map((c) => c.id)),
    gs = new Set(d.garments.map((g) => g.id));
  if (
    d.garments.some((g) => !cats.has(g.categoryId)) ||
    d.outfits.some(
      (o) =>
        !types.has(o.classificationId) ||
        o.pieces.some((p) => !gs.has(p.garmentId)),
    )
  )
    throw Error("Hay referencias rotas en los datos.");
  for (const o of d.outfits)
    if (new Set(o.pieces.map((p) => p.garmentId)).size !== o.pieces.length)
      throw Error("Prenda repetida en una composición.");
  return d;
}
export function heads(revisions: Revision[]): Revision[] {
  const map = new Map(revisions.map((r) => [r.id, r]));
  if (map.size !== revisions.length)
    throw Error("Historial con IDs duplicados. No se modificaron los datos.");
  const parents = new Set(revisions.flatMap((r) => r.parents));
  for (const r of revisions)
    for (const p of r.parents)
      if (!map.has(p))
        throw Error(
          "Historial incompleto. Actualiza de nuevo; no se guardarán cambios.",
        );
  const done = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (done.has(id)) return;
    if (visiting.has(id)) throw Error("Historial cíclico no válido.");
    visiting.add(id);
    for (const p of map.get(id)!.parents) visit(p);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of map.keys()) visit(id);
  return revisions
    .filter((r) => !parents.has(r.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export const sameHeads = (a: string[], b: string[]) =>
  [...a].sort().join("|") === [...b].sort().join("|");
export function removeGarment(d: Data, id: string): Data {
  return {
    ...d,
    garments: d.garments.filter((g) => g.id !== id),
    outfits: d.outfits.map((o) =>
      o.pieces.some((p) => p.garmentId === id)
        ? {
            ...o,
            pieces: o.pieces.filter((p) => p.garmentId !== id),
            updatedAt: now(),
          }
        : o,
    ),
  };
}
export function autoLayout(ids: string[]): Piece[] {
  const cols = ids.length <= 1 ? 1 : ids.length <= 4 ? 2 : 3,
    rows = Math.ceil(ids.length / cols);
  return ids.map((garmentId, i) => ({
    garmentId,
    x: ((i % cols) + 0.5) / cols,
    y: (Math.floor(i / cols) + 0.5) / Math.max(rows, 1),
    w: 0.84 / cols,
    h: 0.84 / Math.max(rows, 1),
    rotation: 0,
    z: i,
  }));
}
export function allPhotos(d: Data): Photo[] {
  return [...d.garments, ...d.outfits].flatMap((x) => x.photos);
}
export function allFiles(d: Data): string[] {
  return [
    ...new Set(
      allPhotos(d).flatMap((p) => [
        p.original,
        ...(p.processed ? [p.processed] : []),
      ]),
    ),
  ];
}
export function movePiece(p: Piece, dx: number, dy: number): Piece {
  return {
    ...p,
    x: Math.max(0, Math.min(1, p.x + dx)),
    y: Math.max(0, Math.min(1, p.y + dy)),
  };
}
export function historyPush<T>(
  history: T[],
  index: number,
  next: T,
): { history: T[]; index: number } {
  const h = [...history.slice(0, index + 1), structuredClone(next)].slice(-60);
  return { history: h, index: h.length - 1 };
}
