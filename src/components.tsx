import { useEffect, useRef, useState, useId, type ReactNode } from "react";
import { X, ImagePlus, Heart, Camera, Trash2, Check } from "lucide-react";
import type { Photo, Outfit, Data } from "./domain";
import { addPhoto, addProcessed, photoBlob } from "./photos";
import type { Store } from "./storage";
import { reauthorize } from "./auth";
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon"
          aria-label="Cerrar"
          onClick={close}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PhotoView({
  store,
  photoKey,
  alt,
  className = "",
  contain = false,
}: {
  store: Store | null;
  photoKey?: string;
  alt: string;
  className?: string;
  contain?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true,
      u = "";
    setUrl("");
    setError(false);
    if (store && photoKey)
      photoBlob(store, photoKey)
        .then((blob) => {
          if (alive) {
            u = URL.createObjectURL(blob);
            setUrl(u);
          }
        })
        .catch(() => {
          if (alive) setError(true);
        });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [store, photoKey]);
  return url ? (
    <img
      draggable={false}
      className={`${className} ${contain ? "contain" : ""}`}
      src={url}
      alt={alt}
    />
  ) : (
    <span
      className={`photo-placeholder ${className}`}
      role="img"
      aria-label={alt}
    >
      {error ? "Foto no disponible" : "…"}
    </span>
  );
}
export function Favorite({
  value,
  onClick,
  label,
}: {
  value: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={"icon favorite " + (value ? "active" : "")}
      aria-label={`${value ? "Quitar de" : "Agregar a"} favoritos: ${label}`}
      aria-pressed={value}
      onClick={onClick}
    >
      <Heart size={18} fill={value ? "currentColor" : "none"} />
    </button>
  );
}
export function PhotoFields({
  photos,
  onChange,
  store,
  real = false,
}: {
  photos: Photo[];
  onChange: (p: Photo[]) => void;
  store: Store;
  real?: boolean;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    setBusy(true);
    setError("");
    try {
      if (photos.length + selectedFiles.length > 20)
        throw Error("Máximo 20 fotos.");
      const added = [];
      for (const f of selectedFiles) added.push(await addPhoto(f));
      onChange([...photos, ...added]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="photo-fields">
      <div className="field-label">
        {real
          ? "Fotos del look puesto (opcional)"
          : "Fotografías · al menos una"}
      </div>
      <div className="upload-actions">
        <label className="button secondary">
          <ImagePlus size={18} />
          Subir fotos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className="button secondary">
          <Camera size={18} />
          Usar cámara
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            disabled={busy}
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="muted small">
        JPG, PNG o WebP · hasta 20 MiB por foto. Conservamos el original.
      </p>
      {busy && <p role="status">Preparando fotografías…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="photo-edit-grid">
        {photos.map((p, i) => (
          <div className="photo-edit" key={p.id}>
            <div className="photo-pair">
              <div>
                <PhotoView
                  store={store}
                  photoKey={p.original}
                  alt={`Original ${i + 1}`}
                />
                <span>Original</span>
              </div>
              {p.processed && (
                <div className="checker">
                  <PhotoView
                    store={store}
                    photoKey={p.processed}
                    alt={`Recorte ${i + 1}`}
                    contain
                  />
                  <span>Recorte</span>
                </div>
              )}
            </div>
            <div className="row wrap">
              {!real && (
                <label className="button secondary small">
                  {p.processed ? "Cambiar recorte" : "Añadir recorte"}
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/webp"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        const key = await addProcessed(f);
                        onChange(
                          photos.map((x) =>
                            x.id === p.id ? { ...x, processed: key } : x,
                          ),
                        );
                        setError("");
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  />
                </label>
              )}
              {p.processed && (
                <button
                  type="button"
                  className="text-button small"
                  onClick={() =>
                    onChange(
                      photos.map((x) =>
                        x.id === p.id ? { ...x, processed: undefined } : x,
                      ),
                    )
                  }
                >
                  Usar original
                </button>
              )}
              <button
                type="button"
                className="icon danger"
                aria-label={`Eliminar foto ${i + 1} del registro`}
                onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {!real && (
        <p className="muted small">
          Recorte voluntario: carga un PNG/WebP transparente y revisa la vista
          previa. El automático está pendiente de validar licencia y
          rendimiento; puedes registrar tu prenda sin él.
        </p>
      )}
    </div>
  );
}
export function Composition({
  outfit,
  data,
  store,
}: {
  outfit: Outfit;
  data: Data;
  store: Store | null;
}) {
  return (
    <div className="composition" aria-label={`Composición de ${outfit.name}`}>
      {outfit.pieces.map((p) => {
        const g = data.garments.find((g) => g.id === p.garmentId);
        return (
          g && (
            <div
              key={p.garmentId}
              className="composition-piece"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: `${p.w * 100}%`,
                height: `${p.h * 100}%`,
                transform: `translate(-50%,-50%) rotate(${p.rotation}deg)`,
                zIndex: p.z,
              }}
            >
              <PhotoView
                store={store}
                photoKey={g.photos[0].processed || g.photos[0].original}
                alt={g.name}
                contain
              />
            </div>
          )
        );
      })}
      {!outfit.pieces.length && (
        <span className="empty-composition">Sin prendas</span>
      )}
    </div>
  );
}
export function Success({ children }: { children: ReactNode }) {
  return (
    <span className="row">
      <Check size={16} />
      {children}
    </span>
  );
}
export function RenewSession({ store }: { store: Store }) {
  const [state, setState] = useState("");
  if (store.kind !== "cloud") return null;
  return (
    <div>
      <button
        type="button"
        className="secondary small"
        onClick={async () => {
          setState("Renovando…");
          try {
            await reauthorize();
            setState(
              "Sesión renovada. Vuelve a guardar; tu formulario se conservó.",
            );
          } catch (e) {
            setState((e as Error).message);
          }
        }}
      >
        Renovar sesión Microsoft
      </button>
      {state && (
        <p role="status" className="small muted">
          {state}
        </p>
      )}
    </div>
  );
}
