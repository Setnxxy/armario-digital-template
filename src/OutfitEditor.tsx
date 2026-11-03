import { useState, useRef } from "react";
import {
  Undo2,
  Redo2,
  WandSparkles,
  Save,
  ArrowUp,
  ArrowDown,
  Move,
  RotateCw,
  Plus,
  Minus,
} from "lucide-react";
import { Modal, PhotoFields, PhotoView, RenewSession } from "./components";
import {
  autoLayout,
  historyPush,
  movePiece,
  now,
  uuid,
  type Outfit,
  type Data,
  type Piece,
} from "./domain";
import type { Store } from "./storage";
type Gesture = {
  id: string;
  startX: number;
  startY: number;
  pieces: Piece[];
  width: number;
  height: number;
  changed: boolean;
};
export function OutfitEditor({
  initial,
  data,
  store,
  onSave,
  close,
}: {
  initial?: Outfit;
  data: Data;
  store: Store;
  onSave: (o: Outfit) => Promise<void>;
  close: () => void;
}) {
  const [o, setO] = useState<Outfit>(
    initial
      ? structuredClone(initial)
      : {
          id: uuid(),
          name: "",
          classificationId: data.classifications[0].id,
          pieces: [],
          photos: [],
          notes: "",
          favorite: false,
          createdAt: now(),
          updatedAt: now(),
        },
  );
  const [history, setHistory] = useState<Piece[][]>([
      structuredClone(o.pieces),
    ]),
    [index, setIndex] = useState(0),
    [pieces, setPieces] = useState(o.pieces),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const canvas = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null);
  function commit(next: Piece[]) {
    setPieces(next);
    const v = historyPush(history, index, next);
    setHistory(v.history);
    setIndex(v.index);
  }
  function patch(id: string, change: Partial<Piece>) {
    commit(pieces.map((p) => (p.garmentId === id ? { ...p, ...change } : p)));
  }
  function toggle(id: string) {
    if (pieces.some((p) => p.garmentId === id)) {
      commit(pieces.filter((p) => p.garmentId !== id));
      if (selected === id) setSelected("");
    } else {
      if (pieces.length >= 50) {
        setError("Hasta 50 prendas por outfit.");
        return;
      }
      commit(autoLayout([...pieces.map((p) => p.garmentId), id]));
      setSelected(id);
    }
  }
  const active = pieces.find((p) => p.garmentId === selected);
  return (
    <Modal
      title={initial ? "Editar outfit" : "Crear un outfit"}
      wide
      close={() => {
        if (!busy) close();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!o.name.trim() || !pieces.length) {
            setError("Escribe un nombre y elige al menos una prenda.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await onSave({
              ...o,
              name: o.name.trim(),
              pieces,
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
        <fieldset disabled={busy}>
          <div className="editor-meta">
            <label>
              Nombre del outfit *
              <input
                placeholder="Dale un nombre a tu look"
                value={o.name}
                maxLength={120}
                required
                onChange={(e) => setO({ ...o, name: e.target.value })}
              />
            </label>
            <label>
              Clasificación
              <select
                value={o.classificationId}
                onChange={(e) =>
                  setO({ ...o, classificationId: e.target.value })
                }
              >
                {data.classifications.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="editor-grid">
            <section className="piece-library">
              <h3>
                Tu selección <span className="count">{pieces.length}</span>
              </h3>
              <label className="sr-only" htmlFor="piece-search">
                Buscar prendas para outfit
              </label>
              <input
                id="piece-search"
                placeholder="Buscar prendas…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="piece-options">
                {data.garments
                  .filter((g) =>
                    g.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((g) => (
                    <button
                      type="button"
                      className={
                        "piece-option " +
                        (pieces.some((p) => p.garmentId === g.id)
                          ? "chosen"
                          : "")
                      }
                      key={g.id}
                      onClick={() => toggle(g.id)}
                      aria-pressed={pieces.some((p) => p.garmentId === g.id)}
                    >
                      <PhotoView
                        store={store}
                        photoKey={g.photos[0].processed || g.photos[0].original}
                        alt=""
                        contain
                      />
                      <span>{g.name}</span>
                      {pieces.some((p) => p.garmentId === g.id) ? (
                        <Minus size={16} />
                      ) : (
                        <Plus size={16} />
                      )}
                    </button>
                  ))}
              </div>
              {!data.garments.length && (
                <p className="muted">Añade prendas a tu armario primero.</p>
              )}
            </section>
            <section className="canvas-section">
              <div className="canvas-toolbar">
                <div className="row">
                  <button
                    type="button"
                    className="icon"
                    aria-label="Deshacer"
                    disabled={index === 0}
                    onClick={() => {
                      setIndex(index - 1);
                      setPieces(structuredClone(history[index - 1]));
                    }}
                  >
                    <Undo2 size={19} />
                  </button>
                  <button
                    type="button"
                    className="icon"
                    aria-label="Rehacer"
                    disabled={index === history.length - 1}
                    onClick={() => {
                      setIndex(index + 1);
                      setPieces(structuredClone(history[index + 1]));
                    }}
                  >
                    <Redo2 size={19} />
                  </button>
                </div>
                <button
                  type="button"
                  className="secondary small"
                  disabled={!pieces.length}
                  onClick={() =>
                    commit(autoLayout(pieces.map((p) => p.garmentId)))
                  }
                >
                  <WandSparkles size={16} />
                  Distribuir automáticamente
                </button>
              </div>
              <div
                ref={canvas}
                className="editor-canvas"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelected("");
                }}
              >
                {pieces.map((p) => {
                  const g = data.garments.find((g) => g.id === p.garmentId)!;
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Mover ${g.name}`}
                      aria-pressed={selected === g.id}
                      key={g.id}
                      className={
                        "editable-piece " +
                        (selected === g.id ? "selected" : "")
                      }
                      style={{
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        width: `${p.w * 100}%`,
                        height: `${p.h * 100}%`,
                        transform: `translate(-50%,-50%) rotate(${p.rotation}deg)`,
                        zIndex: p.z + 100,
                      }}
                      onFocus={() => setSelected(g.id)}
                      onKeyDown={(e) => {
                        const d = e.shiftKey ? 0.04 : 0.01;
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                          commit(
                            pieces.map((x) =>
                              x.garmentId === p.garmentId
                                ? movePiece(
                                    x,
                                    e.key === "ArrowLeft"
                                      ? -d
                                      : e.key === "ArrowRight"
                                        ? d
                                        : 0,
                                    e.key === "ArrowUp"
                                      ? -d
                                      : e.key === "ArrowDown"
                                        ? d
                                        : 0,
                                  )
                                : x,
                            ),
                          );
                        }
                        if (e.key === "Delete") {
                          e.preventDefault();
                          toggle(g.id);
                        }
                        if (e.key === "[" || e.key === "]") {
                          e.preventDefault();
                          patch(g.id, {
                            rotation: Math.max(
                              -360,
                              Math.min(
                                360,
                                p.rotation + (e.key === "]" ? 5 : -5),
                              ),
                            ),
                          });
                        }
                      }}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        setSelected(g.id);
                        e.currentTarget.focus();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const rect = canvas.current!.getBoundingClientRect();
                        gesture.current = {
                          id: g.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          pieces: structuredClone(pieces),
                          width: rect.width,
                          height: rect.height,
                          changed: false,
                        };
                      }}
                      onPointerMove={(e) => {
                        const v = gesture.current;
                        if (!v || v.id !== g.id) return;
                        v.changed = true;
                        const dx = (e.clientX - v.startX) / v.width,
                          dy = (e.clientY - v.startY) / v.height;
                        setPieces(
                          v.pieces.map((x) =>
                            x.garmentId === g.id ? movePiece(x, dx, dy) : x,
                          ),
                        );
                      }}
                      onPointerUp={(e) => {
                        const v = gesture.current;
                        gesture.current = null;
                        if (v?.changed) commit(pieces);
                        if (e.currentTarget.hasPointerCapture(e.pointerId))
                          e.currentTarget.releasePointerCapture(e.pointerId);
                      }}
                      onPointerCancel={() => {
                        if (gesture.current) setPieces(gesture.current.pieces);
                        gesture.current = null;
                      }}
                    >
                      <PhotoView
                        store={store}
                        photoKey={g.photos[0].processed || g.photos[0].original}
                        alt={g.name}
                        contain
                      />
                    </div>
                  );
                })}
                {!pieces.length && (
                  <div className="canvas-empty">
                    <Move size={36} />
                    <h3>Empieza con una prenda</h3>
                    <p>
                      Elige piezas de tu armario.
                      <br />
                      Nosotros las acomodamos; tú haces el resto.
                    </p>
                  </div>
                )}
              </div>
              <p className="muted small">
                Arrastra con mouse o dedo. Teclado: flechas para mover, Shift
                para pasos grandes, [ y ] para girar, Supr para quitar.
              </p>
              {active && (
                <div className="transform-controls">
                  <label>
                    Tamaño
                    <input
                      aria-label="Tamaño de prenda"
                      type="range"
                      min="0.08"
                      max="0.9"
                      step="0.01"
                      value={active.w}
                      onChange={(e) => {
                        const w = +e.target.value;
                        patch(selected, {
                          w,
                          h: Math.max(
                            0.05,
                            Math.min(1, (active.h * w) / active.w),
                          ),
                        });
                      }}
                    />
                  </label>
                  <label>
                    Rotación <span>{Math.round(active.rotation)}°</span>
                    <input
                      aria-label="Rotación de prenda"
                      type="range"
                      min="-180"
                      max="180"
                      value={active.rotation}
                      onChange={(e) =>
                        patch(selected, { rotation: +e.target.value })
                      }
                    />
                  </label>
                  <div className="row">
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => {
                        const order = [...pieces]
                          .sort((a, b) => a.z - b.z)
                          .filter((p) => p.garmentId !== selected);
                        order.push(active);
                        commit(order.map((p, z) => ({ ...p, z })));
                      }}
                    >
                      <ArrowUp size={16} />
                      Al frente
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => {
                        const order = [
                          active,
                          ...[...pieces]
                            .sort((a, b) => a.z - b.z)
                            .filter((p) => p.garmentId !== selected),
                        ];
                        commit(order.map((p, z) => ({ ...p, z })));
                      }}
                    >
                      <ArrowDown size={16} />
                      Al fondo
                    </button>
                    <button
                      type="button"
                      className="icon"
                      aria-label="Restablecer rotación"
                      onClick={() => patch(selected, { rotation: 0 })}
                    >
                      <RotateCw size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
          <div className="form-grid">
            <label>
              Notas
              <textarea
                value={o.notes}
                onChange={(e) => setO({ ...o, notes: e.target.value })}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={o.favorite}
                onChange={(e) => setO({ ...o, favorite: e.target.checked })}
              />
              Guardar en favoritos
            </label>
          </div>
          <PhotoFields
            photos={o.photos}
            onChange={(photos) => setO({ ...o, photos })}
            store={store}
            real
          />
        </fieldset>
        {error && (
          <p role="alert" className="error">
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
            {busy ? "Guardando…" : "Guardar outfit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
