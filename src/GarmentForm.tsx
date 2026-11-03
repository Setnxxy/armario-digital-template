import { useState } from "react";
import { Save } from "lucide-react";
import { Modal, PhotoFields, RenewSession } from "./components";
import { now, uuid, type Garment, type Data } from "./domain";
import type { Store } from "./storage";
export function GarmentForm({
  initial,
  data,
  store,
  onSave,
  close,
}: {
  initial?: Garment;
  data: Data;
  store: Store;
  onSave: (g: Garment) => Promise<void>;
  close: () => void;
}) {
  const [g, set] = useState<Garment>(
      initial
        ? structuredClone(initial)
        : {
            id: uuid(),
            name: "",
            categoryId: data.categories[0].id,
            photos: [],
            color: "",
            brand: "",
            size: "",
            tags: [],
            notes: "",
            favorite: false,
            createdAt: now(),
            updatedAt: now(),
          },
    ),
    [tags, setTags] = useState(g.tags.join(", ")),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const field = (
    k: "name" | "color" | "brand" | "size" | "notes",
    label: string,
    required = false,
  ) => (
    <label>
      {label}
      {required ? " *" : ""}
      <input
        value={g[k]}
        maxLength={k === "name" ? 120 : 1000}
        required={required}
        onChange={(e) => set({ ...g, [k]: e.target.value })}
      />
    </label>
  );
  return (
    <Modal
      title={initial ? "Editar prenda" : "Una nueva prenda"}
      close={() => {
        if (!busy) close();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (!g.name.trim() || !g.photos.length) {
            setError("Escribe un nombre y añade al menos una foto.");
            return;
          }
          setBusy(true);
          try {
            await onSave({
              ...g,
              name: g.name.trim(),
              tags: tags
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
              updatedAt: now(),
            });
            close();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">
          Las piezas que hacen tu estilo. Los campos con * son obligatorios.
        </p>
        <fieldset disabled={busy}>
          <div className="form-grid">
            {field("name", "Nombre", true)}
            <label>
              Categoría *
              <select
                value={g.categoryId}
                onChange={(e) => set({ ...g, categoryId: e.target.value })}
              >
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {field("color", "Color")}
            {field("brand", "Marca")}
            {field("size", "Talla")}
            <label>
              Etiquetas (separadas por coma)
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
          </div>
          <label>
            Notas
            <textarea
              value={g.notes}
              maxLength={10000}
              onChange={(e) => set({ ...g, notes: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={g.favorite}
              onChange={(e) => set({ ...g, favorite: e.target.checked })}
            />
            Guardar en favoritos
          </label>
          <PhotoFields
            photos={g.photos}
            onChange={(photos) => set({ ...g, photos })}
            store={store}
          />
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {error && <RenewSession store={store} />}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={close}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            <Save size={17} />
            {busy ? "Guardando…" : "Guardar prenda"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
