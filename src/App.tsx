import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  Shirt,
  LayoutGrid,
  Layers,
  Heart,
  Settings,
  Plus,
  Search,
  Grid2X2,
  List,
  ArrowUpRight,
  Cloud,
  RefreshCw,
  LogOut,
  Menu,
  ChevronRight,
  ArrowRight,
  Download,
  Upload,
  Check,
  AlertCircle,
  WifiOff,
  X,
  Copy,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  emptyData,
  heads,
  now,
  uuid,
  removeGarment,
  defaults,
  type Data,
  type Garment,
  type Outfit,
  type Revision,
  type Preferences,
} from "./domain";
import { DemoStore, publish, ConflictError, type Store } from "./storage";
import { GraphStore } from "./graph";
import { signIn, signOut, signedIn, clientId } from "./auth";
import { seedDemo } from "./demo";
import { persistPhotos, discardDrafts } from "./photos";
import { exportBackup, importBackup, download } from "./backup";
import { PhotoView, Composition, Favorite, Modal } from "./components";
import { GarmentForm } from "./GarmentForm";
import { OutfitEditor } from "./OutfitEditor";
type Page = "wardrobe" | "categories" | "outfits" | "favorites" | "settings";
const navigation: { id: Page | "create"; label: string; icon: typeof Shirt }[] =
  [
    { id: "wardrobe", label: "Mi armario", icon: Shirt },
    { id: "categories", label: "Categorías", icon: LayoutGrid },
    { id: "create", label: "Crear outfit", icon: Plus },
    { id: "outfits", label: "Mis outfits", icon: Layers },
    { id: "favorites", label: "Favoritos", icon: Heart },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];
function localPrefs(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem("armario-preferences") || "null");
    return p &&
      ["dark", "light", "auto"].includes(p.theme) &&
      ["grid", "list"].includes(p.view) &&
      ["date", "name", "category"].includes(p.sort)
      ? p
      : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
export default function App() {
  const [page, setPage] = useState<Page>("wardrobe"),
    [data, setData] = useState<Data>(emptyData),
    [store, setStore] = useState<Store | null>(null),
    [versions, setVersions] = useState<Revision[]>([]),
    [prefs, setPrefs] = useState(localPrefs),
    [status, setStatus] = useState("Sin conectar"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [color, setColor] = useState(""),
    [tag, setTag] = useState(""),
    [classification, setClassification] = useState("");
  const [garmentEdit, setGarmentEdit] = useState<Garment | null | undefined>(
      undefined,
    ),
    [outfitEdit, setOutfitEdit] = useState<Outfit | null | undefined>(
      undefined,
    ),
    [detail, setDetail] = useState<{
      kind: "garment" | "outfit";
      id: string;
    } | null>(null),
    [draft, setDraft] = useState<Data | null>(null),
    [diagnostic, setDiagnostic] = useState<string[]>([]),
    [publicId, setPublicId] = useState(clientId),
    [installEvent, setInstallEvent] = useState<any>(null),
    [updateReady, setUpdateReady] = useState(false);
  const parents = versions.map((v) => v.id);
  const hasConflict = versions.length > 1 || !!draft;
  const canEdit =
    !!store && !busy && !hasConflict && (store.kind === "demo" || online);
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => {
      if (garmentEdit !== undefined || outfitEdit !== undefined || draft) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [garmentEdit, outfitEdit, draft]);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  function applyPrefs(p: Preferences, remote = false) {
    if (!remote) localStorage.setItem("armario-preferences-dirty", "1");
    setData((prev) => ({ ...prev, preferences: p }));
    setPrefs(p);
    localStorage.setItem("armario-preferences", JSON.stringify(p));
  }
  function receivePrefs(p: Preferences) {
    applyPrefs(
      localStorage.getItem("armario-preferences-dirty") ? localPrefs() : p,
      true,
    );
  }
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const theme = () =>
      (document.documentElement.dataset.theme =
        prefs.theme === "auto" ? (mq.matches ? "dark" : "light") : prefs.theme);
    theme();
    mq.addEventListener("change", theme);
    return () => mq.removeEventListener("change", theme);
  }, [prefs.theme]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    const install = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", install);
    const ready = () => setUpdateReady(true);
    window.addEventListener("armario-update", ready);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("armario-update", ready);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (sessionStorage.getItem("armario-mode") === "demo") {
          const s = new DemoStore();
          const v = heads(await s.list());
          if (alive) {
            setStore(s);
            setVersions(v);
            if (v.length === 1) {
              setData(v[0].data);
              receivePrefs(v[0].data.preferences);
            }
            setStatus("Modo de prueba · guardado local");
          }
        } else if (await signedIn()) {
          if (alive) setBusy(true);
          const s = await new GraphStore().init();
          const v = heads(await s.list());
          if (alive) {
            setStore(s);
            setVersions(v);
            setData(v[0]?.data || emptyData());
            if (v.length === 1) receivePrefs(v[0].data.preferences);
            setStatus(
              v.length > 1 ? "Conflicto pendiente" : "Conectado a OneDrive",
            );
          }
        }
      } catch (e) {
        if (alive) setError(message(e));
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function refresh() {
    if (!store) return;
    setBusy(true);
    setError("");
    try {
      const v = heads(await store.list());
      setVersions(v);
      if (v.length === 1) {
        setData(v[0].data);
        receivePrefs(v[0].data.preferences);
      } else if (!v.length) setData(emptyData());
      setStatus(
        v.length > 1
          ? "Conflicto pendiente"
          : store.kind === "demo"
            ? "Modo de prueba · guardado local"
            : "Sincronizado con OneDrive",
      );
    } catch (e) {
      setError(message(e));
      setStatus("No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  }
  refreshRef.current = refresh;
  useEffect(() => {
    const visible = () => {
      if (
        document.visibilityState === "visible" &&
        store &&
        !busy &&
        garmentEdit === undefined &&
        outfitEdit === undefined &&
        !detail &&
        !draft
      )
        void refreshRef.current();
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [store, busy, garmentEdit, outfitEdit, detail, draft]);
  function message(e: unknown) {
    return e instanceof Error
      ? e.name === "ZodError"
        ? "Datos no válidos o de otra versión. No se modificó tu armario."
        : e.message
      : "No se pudo completar la operación.";
  }
  async function demo() {
    setBusy(true);
    setError("");
    try {
      const s = new DemoStore();
      let v = heads(await s.list());
      if (!v.length) {
        const d = await seedDemo(s);
        v = await publish(s, d, []);
      }
      setStore(s);
      setVersions(v);
      setData(v[0]?.data || emptyData());
      if (v.length === 1) receivePrefs(v[0].data.preferences);
      sessionStorage.setItem("armario-mode", "demo");
      setStatus("Modo de prueba · guardado local");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    try {
      sessionStorage.removeItem("armario-mode");
      await signIn();
    } catch (e) {
      setError(message(e));
    }
  }
  async function save(next: Data, resolve = false) {
    if (!store) throw Error("Elige modo de prueba o conecta OneDrive.");
    if (store.kind === "cloud" && !online)
      throw Error(
        "Sin conexión. No se guardó en OneDrive. El formulario sigue abierto.",
      );
    setBusy(true);
    setError("");
    setStatus(
      store.kind === "cloud" ? "Guardando en OneDrive…" : "Guardando prueba…",
    );
    try {
      const persisted = await persistPhotos(store, next);
      const v = await publish(store, persisted, parents, resolve);
      setVersions(v);
      if (v.length !== 1) {
        setDraft(persisted);
        setStatus("Conflicto pendiente");
        throw new ConflictError(v);
      }
      setData(v[0].data);
      localStorage.removeItem("armario-preferences-dirty");
      applyPrefs(v[0].data.preferences, true);
      setDraft(null);
      setStatus(
        store.kind === "cloud"
          ? "Sincronizado con OneDrive"
          : "Modo de prueba · guardado local",
      );
      setToast(
        store.kind === "cloud"
          ? "Guardado en OneDrive"
          : "Guardado en modo de prueba",
      );
    } catch (e) {
      if (e instanceof ConflictError) {
        setVersions(e.versions);
        setDraft(next);
        setError(
          "Hay versiones en conflicto. Cierra el formulario para revisar y elegir; tu propuesta se conserva.",
        );
      } else {
        setError(message(e));
        setStatus("Guardado no confirmado");
      }
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    }
  }
  function go(id: Page | "create") {
    setMobileMenu(false);
    setQuery("");
    setCategory("");
    setColor("");
    setTag("");
    setClassification("");
    if (id === "create") {
      if (store) {
        setOutfitEdit(null);
        setPage("outfits");
      } else {
        setError(
          "Entra al modo de prueba o conecta OneDrive para crear outfits.",
        );
      }
    } else setPage(id);
  }
  function sorted<T extends Garment | Outfit>(items: T[]): T[] {
    return [...items].sort((a, b) =>
      prefs.sort === "name"
        ? a.name.localeCompare(b.name, "es")
        : prefs.sort === "category"
          ? ("categoryId" in a
              ? catName(a.categoryId)
              : typeName(a.classificationId)
            ).localeCompare(
              "categoryId" in b
                ? catName(b.categoryId)
                : typeName(b.classificationId),
              "es",
            )
          : b.createdAt.localeCompare(a.createdAt),
    );
  }
  const catName = (id: string) =>
      data.categories.find((c) => c.id === id)?.name || "Sin categoría",
    typeName = (id: string) =>
      data.classifications.find((c) => c.id === id)?.name ||
      "Sin clasificación";
  const matches = (x: Garment | Outfit) =>
    [
      x.name,
      x.notes,
      ...("tags" in x ? [x.color, x.brand, x.size, ...x.tags] : []),
    ]
      .join(" ")
      .toLocaleLowerCase("es")
      .includes(query.toLocaleLowerCase("es"));
  const garments = sorted(
    data.garments.filter(
      (g) =>
        matches(g) &&
        (!category || g.categoryId === category) &&
        (!color || g.color === color) &&
        (!tag || g.tags.includes(tag)) &&
        (page !== "favorites" || g.favorite),
    ),
  );
  const outfits = sorted(
    data.outfits.filter(
      (o) =>
        matches(o) &&
        (!classification || o.classificationId === classification) &&
        (page !== "favorites" || o.favorite),
    ),
  );
  async function removeItem(kind: "garment" | "outfit", id: string) {
    if (!canEdit) return;
    const uses =
      kind === "garment"
        ? data.outfits.filter((o) => o.pieces.some((p) => p.garmentId === id))
            .length
        : 0;
    if (
      !confirm(
        kind === "garment"
          ? `¿Eliminar esta prenda?${uses ? ` Se usa en ${uses} outfit(s): se retirará de sus composiciones. Los outfits y fotos reales se conservan.` : ""} El historial conserva los originales.`
          : "¿Eliminar este outfit? Las prendas no se eliminan.",
      )
    )
      return;
    await save(
      kind === "garment"
        ? removeGarment(data, id)
        : { ...data, outfits: data.outfits.filter((o) => o.id !== id) },
    );
    setDetail(null);
  }
  function garmentCard(g: Garment) {
    return (
      <article className="garment-card" key={g.id}>
        <div className="card-image">
          <button
            className="photo-link"
            aria-label={`Ver ${g.name}`}
            onClick={() => setDetail({ kind: "garment", id: g.id })}
          >
            <PhotoView
              store={store}
              photoKey={g.photos[0].processed || g.photos[0].original}
              alt={g.name}
            />
          </button>
          <Favorite
            value={g.favorite}
            label={g.name}
            onClick={() => {
              if (canEdit)
                void act(() =>
                  save({
                    ...data,
                    garments: data.garments.map((x) =>
                      x.id === g.id
                        ? { ...x, favorite: !x.favorite, updatedAt: now() }
                        : x,
                    ),
                  }),
                );
            }}
          />
        </div>
        <div className="card-info">
          <div>
            <p className="eyebrow">{catName(g.categoryId)}</p>
            <button
              className="card-title"
              onClick={() => setDetail({ kind: "garment", id: g.id })}
            >
              {g.name}
            </button>
            <p className="muted small">
              {[g.color, g.brand, g.size && `Talla ${g.size}`]
                .filter(Boolean)
                .join(" · ") || "Lista para combinar"}
            </p>
          </div>
          <button
            className="icon card-arrow"
            aria-label={`Editar ${g.name}`}
            disabled={!canEdit}
            onClick={() => setGarmentEdit(g)}
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
      </article>
    );
  }
  function outfitCard(o: Outfit) {
    return (
      <article className="outfit-card" key={o.id}>
        <div className="outfit-cover">
          <button
            className="photo-link"
            aria-label={`Ver outfit ${o.name}`}
            onClick={() => setDetail({ kind: "outfit", id: o.id })}
          >
            <Composition outfit={o} data={data} store={store} />
          </button>
          <Favorite
            value={o.favorite}
            label={o.name}
            onClick={() => {
              if (canEdit)
                void act(() =>
                  save({
                    ...data,
                    outfits: data.outfits.map((x) =>
                      x.id === o.id
                        ? { ...x, favorite: !x.favorite, updatedAt: now() }
                        : x,
                    ),
                  }),
                );
            }}
          />
        </div>
        <div className="card-info">
          <div>
            <p className="eyebrow">{typeName(o.classificationId)}</p>
            <button
              className="card-title"
              onClick={() => setDetail({ kind: "outfit", id: o.id })}
            >
              {o.name}
            </button>
            <p className="muted small">
              {o.pieces.length} prendas · {o.photos.length} fotos reales
            </p>
          </div>
          <button
            className="icon card-arrow"
            aria-label={`Editar outfit ${o.name}`}
            disabled={!canEdit}
            onClick={() => setOutfitEdit(o)}
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
      </article>
    );
  }
  const titles = {
    wardrobe: "Mi armario",
    categories: "Cada pieza, en su lugar",
    outfits: "Mis outfits",
    favorites: "Lo que más te gusta",
    settings: "A tu manera",
  };
  const subtitles = {
    wardrobe: "Lo que tienes. Todo lo que puedes crear.",
    categories: "Un poco de orden, muchas posibilidades.",
    outfits: "Combinaciones que vale la pena repetir.",
    favorites: "Tus prendas y combinaciones favoritas.",
    settings: "Tu espacio, tus preferencias y tus datos.",
  };
  const current =
    detail?.kind === "garment"
      ? data.garments.find((g) => g.id === detail.id)
      : detail
        ? data.outfits.find((o) => o.id === detail.id)
        : undefined;
  const cardClass = `cards ${prefs.view === "list" ? "list-view" : ""}`;
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Ir al contenido
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={() => go("wardrobe")}>
          <svg
            width="36"
            height="34"
            viewBox="0 0 48 44"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 13c0-10 15-10 15 0 0 7-11 8-11 14L6 38c-2 2-1 4 2 4h32c3 0 4-2 2-4L24 27"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <span>
            armario
            <span>
              digital<span className="brand-dot">.</span>
            </span>
          </span>
        </button>
        <div className="sidebar-label">TU ESPACIO PERSONAL</div>
        <nav aria-label="Navegación principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "wardrobe" && (
                <span className="nav-count">{data.garments.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="tiny-line" />
            <p>
              Menos buscar.
              <br />
              <strong>Más combinar.</strong>
            </p>
          </div>
          <div className="account-chip">
            <span className="avatar">
              <Shirt size={19} />
            </span>
            <div>
              <strong>Mi espacio</strong>
              <span>
                {store?.kind === "cloud"
                  ? "OneDrive personal"
                  : store?.kind === "demo"
                    ? "Prueba local"
                    : "Sin conectar"}
              </span>
            </div>
            <span className={"connection-dot " + (store ? "connected" : "")} />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumbs">
            Mi espacio <ChevronRight size={13} />
            <span>
              {page === "wardrobe"
                ? "Armario"
                : page === "outfits"
                  ? "Outfits"
                  : page === "categories"
                    ? "Categorías"
                    : page === "favorites"
                      ? "Favoritos"
                      : "Ajustes"}
            </span>
          </div>
          <button className="mobile-brand" onClick={() => go("wardrobe")}>
            armario<span>digital.</span>
          </button>
          <div className="topbar-actions">
            <span
              className={"sync-status " + (busy ? "loading" : "")}
              role="status"
            >
              {online ? <Cloud size={16} /> : <WifiOff size={16} />}
              <span>{!online ? "Sin conexión" : status}</span>
            </span>
            <button
              className="icon"
              aria-label="Actualizar desde almacenamiento"
              disabled={!store || busy || hasConflict}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} className={busy ? "spin" : ""} />
            </button>
            <button
              className="icon mobile-menu-button"
              aria-label="Abrir menú secundario"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={21} />
            </button>
          </div>
        </header>
        {mobileMenu && (
          <nav className="mobile-menu" aria-label="Menú secundario">
            {navigation
              .filter((n) => ["categories", "settings"].includes(n.id))
              .map((n) => (
                <button key={n.id} onClick={() => go(n.id)}>
                  {n.label}
                </button>
              ))}
          </nav>
        )}
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === "wardrobe" ? "VISTE A TU MANERA" : "ARMARIO DIGITAL"}
              </p>
              <h1>{titles[page]}</h1>
              <p className="muted">{subtitles[page]}</p>
            </div>
            {(page === "wardrobe" ||
              page === "outfits" ||
              page === "favorites") && (
              <button
                className="primary"
                disabled={!canEdit}
                onClick={() =>
                  page === "outfits"
                    ? setOutfitEdit(null)
                    : setGarmentEdit(null)
                }
              >
                <Plus size={18} />
                {page === "outfits" ? "Crear outfit" : "Añadir prenda"}
              </button>
            )}
          </div>
          {!store && (
            <section className="welcome">
              <div>
                <span className="pill">UN ARMARIO CON POSIBILIDADES</span>
                <h2>
                  Tu estilo empieza
                  <br />
                  con lo que ya tienes<span>.</span>
                </h2>
                <p>
                  Fotografía tus prendas, descubre nuevas combinaciones
                  <br className="desktop-only" /> y guarda tus looks en un solo
                  lugar.
                </p>
                <div className="row wrap">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void demo()}
                  >
                    Explorar con ejemplos <ArrowRight size={17} />
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => void login()}
                  >
                    Conectar OneDrive
                  </button>
                </div>
                <p className="small muted">
                  El modo de prueba no utiliza tu cuenta ni guarda en la nube.
                </p>
              </div>
              <div className="welcome-art" aria-hidden="true">
                <div className="art-card art-one">
                  <Shirt size={102} strokeWidth={1} />
                  <span>PIEZAS QUE HABLAN DE TI</span>
                </div>
                <div className="art-card art-two">
                  <svg width="110" height="180" viewBox="0 0 110 180">
                    <path
                      d="M20 10h70l-2 65 12 95H66L55 80l-11 90H10l12-95Z"
                      fill="#464e55"
                    />
                    <path
                      d="M55 14v62M24 22l25 4m12 0 25-4"
                      stroke="#84929c"
                      fill="none"
                    />
                  </svg>
                </div>
                <div className="art-badge">
                  <Sparkles size={17} />
                  Hecho para tu día a día
                </div>
              </div>
            </section>
          )}
          {store?.kind === "demo" && (
            <div className="mode-banner">
              <div>
                <span className="connection-dot connected" />
                <strong>Modo de prueba</strong>
                <span>
                  Ejemplos ilustrados · los cambios se guardan solo en este
                  navegador.
                </span>
              </div>
              <button className="text-button" onClick={() => void login()}>
                Conectar mi OneDrive <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error-banner">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button
                className="icon"
                aria-label="Cerrar aviso"
                onClick={() => setError("")}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {hasConflict && (
            <section className="conflict-panel">
              <h2>Hay versiones que necesitan tu decisión</h2>
              <p>
                No se sobrescribió ninguna revisión. Compara o exporta las
                opciones antes de elegir. Elegir una conserva su contenido
                completo; las demás permanecen en el historial de OneDrive.
              </p>
              <div className="conflict-options">
                {[
                  ...versions.map((v) => ({
                    label: `Versión ${v.device.slice(0, 8)} · ${new Date(v.createdAt).toLocaleString("es-MX")}`,
                    data: v.data,
                  })),
                  ...(draft
                    ? [{ label: "Tu propuesta pendiente", data: draft }]
                    : []),
                ].map((v, i) => (
                  <div className="panel" key={i}>
                    <h3>{v.label}</h3>
                    <p>
                      {v.data.garments.length} prendas · {v.data.outfits.length}{" "}
                      outfits
                    </p>
                    <div className="row wrap">
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            download(
                              await exportBackup(store!, v.data),
                              `armario-version-${i}.zip`,
                            );
                          })
                        }
                      >
                        <Download size={16} />
                        Exportar versión
                      </button>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              `¿Conservar ${v.label}? Revisa su respaldo antes de descartar cambios de otras versiones.`,
                            )
                          )
                            void act(() => save(v.data, true));
                        }}
                      >
                        Conservar esta versión
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void refresh()}
              >
                Volver a consultar versiones
              </button>
            </section>
          )}
          {["wardrobe", "outfits", "favorites"].includes(page) && (
            <>
              <div className="collection-bar">
                <div className="search-field">
                  <Search size={18} />
                  <label className="sr-only" htmlFor="search">
                    Buscar en {page === "outfits" ? "outfits" : "armario"}
                  </label>
                  <input
                    id="search"
                    placeholder={
                      page === "outfits"
                        ? "Buscar tus combinaciones…"
                        : "Buscar prendas, colores, etiquetas…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <div className="view-controls">
                  <label className="sr-only" htmlFor="sort">
                    Ordenar
                  </label>
                  <select
                    id="sort"
                    value={prefs.sort}
                    onChange={(e) =>
                      applyPrefs({
                        ...prefs,
                        sort: e.target.value as Preferences["sort"],
                      })
                    }
                  >
                    <option value="date">Más recientes</option>
                    <option value="name">Nombre A–Z</option>
                    <option value="category">Categoría</option>
                  </select>
                  <div className="segmented">
                    <button
                      className={prefs.view === "grid" ? "selected" : ""}
                      aria-label="Vista cuadrícula"
                      aria-pressed={prefs.view === "grid"}
                      onClick={() => applyPrefs({ ...prefs, view: "grid" })}
                    >
                      <Grid2X2 size={18} />
                    </button>
                    <button
                      className={prefs.view === "list" ? "selected" : ""}
                      aria-label="Vista lista"
                      aria-pressed={prefs.view === "list"}
                      onClick={() => applyPrefs({ ...prefs, view: "list" })}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {page !== "outfits" && (
                <>
                  <div
                    className="category-tabs"
                    aria-label="Filtrar por categoría"
                  >
                    <button
                      className={!category ? "selected" : ""}
                      onClick={() => setCategory("")}
                    >
                      Todas las prendas <span>{data.garments.length}</span>
                    </button>
                    {data.categories.map((c) => (
                      <button
                        key={c.id}
                        className={category === c.id ? "selected" : ""}
                        onClick={() => setCategory(c.id)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <div className="secondary-filters">
                    <label>
                      Color
                      <select
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {[
                          ...new Set(
                            data.garments.map((g) => g.color).filter(Boolean),
                          ),
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Etiqueta
                      <select
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {[...new Set(data.garments.flatMap((g) => g.tags))].map(
                          (t) => (
                            <option key={t}>{t}</option>
                          ),
                        )}
                      </select>
                    </label>
                    {(category || color || tag || query) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setCategory("");
                          setColor("");
                          setTag("");
                          setQuery("");
                        }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                </>
              )}
              {(page === "outfits" || page === "favorites") && (
                <div className="category-tabs">
                  <button
                    className={!classification ? "selected" : ""}
                    onClick={() => setClassification("")}
                  >
                    Todos los estilos
                  </button>
                  {data.classifications.map((c) => (
                    <button
                      key={c.id}
                      className={classification === c.id ? "selected" : ""}
                      onClick={() => setClassification(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {page !== "outfits" && (
                <section aria-label="Prendas">
                  <div className="section-heading">
                    <h2>
                      {page === "favorites"
                        ? "Prendas favoritas"
                        : "Tus prendas"}{" "}
                      <span className="count">{garments.length}</span>
                    </h2>
                    <span className="muted small">
                      Un armario que se siente como tú
                    </span>
                  </div>
                  <div className={cardClass}>
                    {garments.map(garmentCard)}
                    {!garments.length && (
                      <Empty
                        icon={<Shirt size={32} />}
                        title={
                          query || category || color || tag
                            ? "No hay coincidencias"
                            : "Cada historia empieza con una pieza"
                        }
                        text={
                          query || category || color || tag
                            ? "Prueba con otros filtros."
                            : "Añade una prenda y empieza a construir tu armario."
                        }
                      />
                    )}
                  </div>
                </section>
              )}
              {(page === "outfits" || page === "favorites") && (
                <section aria-label="Outfits">
                  <div className="section-heading">
                    <h2>
                      {page === "favorites"
                        ? "Outfits favoritos"
                        : "Tus combinaciones"}{" "}
                      <span className="count">{outfits.length}</span>
                    </h2>
                  </div>
                  <div className={cardClass}>
                    {outfits.map(outfitCard)}
                    {!outfits.length && (
                      <Empty
                        icon={<Layers size={32} />}
                        title="Tu próximo look está aquí"
                        text="Selecciona tus prendas y juega con nuevas combinaciones."
                      />
                    )}
                  </div>
                </section>
              )}
              {page === "wardrobe" && store && (
                <section className="create-callout">
                  <div>
                    <span className="eyebrow">COMBINA LO QUE TE GUSTA</span>
                    <h2>Una pieza. Muchas posibilidades.</h2>
                    <p className="muted">
                      Dale una segunda mirada a tu armario.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    disabled={!canEdit}
                    onClick={() => setOutfitEdit(null)}
                  >
                    Crear un outfit <ArrowRight size={17} />
                  </button>
                </section>
              )}
            </>
          )}
          {page === "categories" && (
            <Taxonomy data={data} canEdit={canEdit} onSave={save} />
          )}
          {page === "settings" && (
            <div className="settings-grid">
              <section className="panel">
                <p className="eyebrow">EL AMBIENTE</p>
                <h2>Apariencia</h2>
                <label>
                  Tema
                  <select
                    aria-label="Tema"
                    value={prefs.theme}
                    onChange={(e) =>
                      applyPrefs({
                        ...prefs,
                        theme: e.target.value as Preferences["theme"],
                      })
                    }
                  >
                    <option value="dark">Oscuro</option>
                    <option value="light">Claro</option>
                    <option value="auto">Automático</option>
                  </select>
                </label>
                <label>
                  Visualización
                  <select
                    aria-label="Visualización"
                    value={prefs.view}
                    onChange={(e) =>
                      applyPrefs({
                        ...prefs,
                        view: e.target.value as Preferences["view"],
                      })
                    }
                  >
                    <option value="grid">Cuadrícula</option>
                    <option value="list">Lista</option>
                  </select>
                </label>
                <label>
                  Orden inicial
                  <select
                    aria-label="Orden inicial"
                    value={prefs.sort}
                    onChange={(e) =>
                      applyPrefs({
                        ...prefs,
                        sort: e.target.value as Preferences["sort"],
                      })
                    }
                  >
                    <option value="date">Más recientes primero</option>
                    <option value="name">Nombre</option>
                    <option value="category">Categoría</option>
                  </select>
                </label>
                <p className="small muted">
                  Se aplican al instante en este navegador. Guarda para
                  sincronizarlas con tus dispositivos.
                </p>
                <button
                  className="secondary"
                  disabled={!canEdit}
                  onClick={() =>
                    void act(() => save({ ...data, preferences: prefs }))
                  }
                >
                  <Check size={16} />
                  Guardar preferencias
                </button>
              </section>
              <section className="panel">
                <p className="eyebrow">TU ESPACIO EN LA NUBE</p>
                <h2>OneDrive personal</h2>
                <p className="muted">
                  {store?.kind === "cloud"
                    ? "Cuenta conectada. La prueba de permisos completa se ejecuta abajo."
                    : "Conecta tu cuenta para recuperar y guardar tu armario en tus dispositivos."}
                </p>
                <p className="small">
                  Permiso solicitado: acceso a la carpeta de esta aplicación. No
                  se solicita acceso general a tus archivos.
                </p>
                {!clientId && (
                  <label>
                    Application (client) ID público
                    <input
                      value={publicId}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      onChange={(e) => setPublicId(e.target.value)}
                    />
                  </label>
                )}
                {!clientId && (
                  <button
                    className="secondary"
                    onClick={() => {
                      if (
                        !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(
                          publicId,
                        )
                      ) {
                        setError("El Client ID debe ser un UUID válido.");
                        return;
                      }
                      localStorage.setItem(
                        "armario-public-client-id",
                        publicId,
                      );
                      location.reload();
                    }}
                  >
                    Guardar Client ID y recargar
                  </button>
                )}
                <div className="row wrap">
                  <button className="primary" onClick={() => void login()}>
                    Iniciar sesión con Microsoft <ArrowUpRight size={16} />
                  </button>
                  {store && (
                    <button
                      className="secondary"
                      onClick={() => {
                        if (store.kind === "cloud") {
                          discardDrafts();
                          void act(() => signOut());
                        } else {
                          sessionStorage.removeItem("armario-mode");
                          discardDrafts();
                          setStore(null);
                          setData(emptyData());
                          setVersions([]);
                          setStatus("Sin conectar");
                        }
                      }}
                    >
                      <LogOut size={16} />
                      Cerrar sesión
                    </button>
                  )}
                </div>
                <details>
                  <summary>Cómo registrar la aplicación Microsoft</summary>
                  <ol>
                    <li>
                      Abre{" "}
                      <a
                        href="https://entra.microsoft.com/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Microsoft Entra
                      </a>{" "}
                      → Registros de aplicaciones → Nuevo registro. Es posible
                      que debas crear o seleccionar un directorio Entra para
                      registrar la aplicación; iniciar sesión en OneDrive no lo
                      crea.
                    </li>
                    <li>
                      Nombre: Armario Digital. Audiencia: cuentas Microsoft
                      personales (o multiorganización y personales).
                    </li>
                    <li>
                      En Autenticación agrega plataforma SPA y la URI exacta{" "}
                      <code>{location.origin}/redirect.html</code>. No uses
                      plataforma Web ni crees client_secret. Añade también{" "}
                      <code>{location.origin}/</code> para volver al cerrar
                      sesión.
                    </li>
                    <li>
                      En permisos API → Microsoft Graph → Delegados agrega
                      Files.ReadWrite.AppFolder. No agregues permisos generales
                      de archivos. Los permisos OIDC de sesión son automáticos.
                    </li>
                    <li>
                      Copia el Application (client) ID público aquí o configura
                      VITE_MICROSOFT_CLIENT_ID al compilar. Si configuras
                      VITE_REDIRECT_URI, debe coincidir exactamente con la SPA.
                    </li>
                    <li>
                      Inicia sesión con tu cuenta personal y ejecuta
                      diagnóstico. Registra también localhost:5173 para
                      desarrollo.
                    </li>
                  </ol>
                </details>
                {store?.kind === "cloud" && (
                  <>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          setBusy(true);
                          setDiagnostic([]);
                          try {
                            const result = await (
                              store as GraphStore
                            ).diagnose();
                            setDiagnostic(result);
                          } finally {
                            setBusy(false);
                          }
                        })
                      }
                    >
                      Probar lectura, escritura y conflictos
                    </button>
                    <p className="small muted">
                      Crea archivos aislados en diagnostico/. No altera tus
                      prendas. La prueba de dos dispositivos físicos sigue
                      siendo necesaria.
                    </p>
                    {diagnostic.map((line, i) => (
                      <p key={i} className="small">
                        <Check size={14} />
                        {line}
                      </p>
                    ))}
                  </>
                )}
              </section>
              <section className="panel">
                <p className="eyebrow">SIEMPRE TUYO</p>
                <h2>Respaldo y recuperación</h2>
                <p className="muted">
                  ZIP con registros, categorías, preferencias, composiciones y
                  todas las fotos originales/recortadas referenciadas. No
                  incluye revisiones históricas ni fotos huérfanas.
                </p>
                <div className="row wrap">
                  <button
                    className="secondary"
                    disabled={!store || busy}
                    onClick={() =>
                      void act(async () => {
                        setBusy(true);
                        try {
                          download(
                            await exportBackup(store!, data),
                            "armario-digital-respaldo.zip",
                          );
                          setToast("Respaldo completo descargado");
                        } finally {
                          setBusy(false);
                        }
                      })
                    }
                  >
                    <Download size={17} />
                    Exportar respaldo
                  </button>
                  <label
                    className={
                      "button secondary " + (!canEdit ? "disabled" : "")
                    }
                  >
                    <Upload size={17} />
                    Restaurar ZIP
                    <input
                      hidden
                      type="file"
                      accept=".zip"
                      disabled={!canEdit}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (
                          !file ||
                          !store ||
                          !confirm(
                            "Restaurar sustituye el armario actual por el respaldo. El historial se conserva. Exporta antes si deseas combinar cambios. ¿Continuar?",
                          )
                        )
                          return;
                        await act(async () => {
                          setBusy(true);
                          try {
                            const imported = await importBackup(store, file);
                            await save(imported);
                          } finally {
                            setBusy(false);
                          }
                        });
                      }}
                    />
                  </label>
                </div>
                <p className="small muted">
                  Límite de respaldo integrado: 250 MiB de fotos. Para un
                  armario mayor, copia completa de Apps/Armario Digital en
                  OneDrive. Mantén tus ZIP en un lugar privado.
                </p>
              </section>
              <section className="panel">
                <p className="eyebrow">SIEMPRE A MANO</p>
                <h2>Instalar Armario Digital</h2>
                <p className="muted">
                  En Chrome o Edge usa «Instalar aplicación». En iPhone: Safari
                  → Compartir → Añadir a pantalla de inicio. En macOS Safari:
                  Archivo → Añadir al Dock.
                </p>
                {installEvent && (
                  <button
                    className="primary"
                    onClick={async () => {
                      await installEvent.prompt();
                      setInstallEvent(null);
                    }}
                  >
                    Instalar aplicación
                  </button>
                )}
                <p className="small muted">
                  V1 necesita conexión para editar tu armario de OneDrive. La
                  interfaz puede abrir sin internet; no simula guardados en la
                  nube.
                </p>
                {updateReady && (
                  <button
                    className="secondary"
                    onClick={() => {
                      if (
                        confirm(
                          "¿Actualizar la aplicación? Guarda o exporta tus formularios primero.",
                        )
                      )
                        window.dispatchEvent(new Event("armario-apply-update"));
                    }}
                  >
                    Actualizar aplicación disponible
                  </button>
                )}
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              armario digital<span className="brand-dot">.</span>
            </span>
            <span>Tu ropa. Tus reglas.</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        <button
          className={page === "wardrobe" ? "active" : ""}
          onClick={() => go("wardrobe")}
        >
          <Shirt size={21} />
          <span>Armario</span>
        </button>
        <button
          className={page === "outfits" ? "active" : ""}
          onClick={() => go("outfits")}
        >
          <Layers size={21} />
          <span>Outfits</span>
        </button>
        <button
          className="bottom-add"
          aria-label="Añadir prenda"
          disabled={!canEdit}
          onClick={() => setGarmentEdit(null)}
        >
          <Plus size={24} />
        </button>
        <button
          className={page === "favorites" ? "active" : ""}
          onClick={() => go("favorites")}
        >
          <Heart size={21} />
          <span>Favoritos</span>
        </button>
        <button
          className={
            page === "settings" || page === "categories" ? "active" : ""
          }
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          <Menu size={21} />
          <span>Más</span>
        </button>
      </nav>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {garmentEdit !== undefined && store && (
        <GarmentForm
          initial={garmentEdit || undefined}
          data={data}
          store={store}
          close={() => setGarmentEdit(undefined)}
          onSave={(g) =>
            save({
              ...data,
              preferences: prefs,
              garments: data.garments.some((x) => x.id === g.id)
                ? data.garments.map((x) => (x.id === g.id ? g : x))
                : [g, ...data.garments],
            })
          }
        />
      )}
      {outfitEdit !== undefined && store && (
        <OutfitEditor
          initial={outfitEdit || undefined}
          data={data}
          store={store}
          close={() => setOutfitEdit(undefined)}
          onSave={(o) =>
            save({
              ...data,
              preferences: prefs,
              outfits: data.outfits.some((x) => x.id === o.id)
                ? data.outfits.map((x) => (x.id === o.id ? o : x))
                : [o, ...data.outfits],
            })
          }
        />
      )}
      {detail && current && store && (
        <Modal title={current.name} wide close={() => setDetail(null)}>
          <div className="detail-grid">
            <div>
              {detail.kind === "outfit" ? (
                <Composition
                  outfit={current as Outfit}
                  data={data}
                  store={store}
                />
              ) : (
                <PhotoView
                  store={store}
                  photoKey={
                    current.photos[0].processed || current.photos[0].original
                  }
                  alt={current.name}
                  className="detail-main"
                />
              )}
              <div className="detail-gallery">
                {current.photos.map((p) => (
                  <div key={p.id}>
                    <PhotoView
                      store={store}
                      photoKey={p.original}
                      alt={`Original: ${p.name}`}
                    />
                    <span className="small muted">Original</span>
                    {p.processed && (
                      <>
                        <PhotoView
                          store={store}
                          photoKey={p.processed}
                          alt="Recorte transparente"
                          contain
                        />
                        <span className="small muted">Recorte</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="pill">
                {"categoryId" in current
                  ? catName(current.categoryId)
                  : typeName(current.classificationId)}
              </span>
              <h3>{current.name}</h3>
              {"color" in current && (
                <dl>
                  {[
                    ["Color", current.color],
                    ["Marca", current.brand],
                    ["Talla", current.size],
                    ["Etiquetas", current.tags.join(", ")],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              )}
              {"pieces" in current && (
                <>
                  <h4>Prendas de este outfit</h4>
                  <ul>
                    {current.pieces.map((p) => (
                      <li key={p.garmentId}>
                        {data.garments.find((g) => g.id === p.garmentId)?.name}
                      </li>
                    ))}
                  </ul>
                  <p className="small muted">
                    {current.photos.length} foto(s) del look puesto
                  </p>
                </>
              )}
              <p className="notes">{current.notes || "Sin notas todavía."}</p>
              <p className="small muted">
                Creado:{" "}
                {new Date(current.createdAt).toLocaleDateString("es-MX")}
                <br />
                Actualizado:{" "}
                {new Date(current.updatedAt).toLocaleString("es-MX")}
              </p>
              <div className="row wrap">
                <button
                  className="primary"
                  disabled={!canEdit}
                  onClick={() => {
                    if (detail.kind === "garment")
                      setGarmentEdit(current as Garment);
                    else setOutfitEdit(current as Outfit);
                    setDetail(null);
                  }}
                >
                  <Pencil size={16} />
                  Editar
                </button>
                {detail.kind === "outfit" && (
                  <button
                    className="secondary"
                    disabled={!canEdit}
                    onClick={() =>
                      void act(async () => {
                        const o = structuredClone(current as Outfit);
                        o.id = uuid();
                        o.name = `${o.name.slice(0, 110)} (copia)`;
                        o.createdAt = now();
                        o.updatedAt = o.createdAt;
                        await save({ ...data, outfits: [o, ...data.outfits] });
                        setDetail({ kind: "outfit", id: o.id });
                      })
                    }
                  >
                    <Copy size={16} />
                    Duplicar
                  </button>
                )}
                <button
                  className="secondary danger"
                  disabled={!canEdit}
                  onClick={() =>
                    void act(() => removeItem(detail.kind, current.id))
                  }
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p className="muted">{text}</p>
    </div>
  );
}
function Taxonomy({
  data,
  canEdit,
  onSave,
}: {
  data: Data;
  canEdit: boolean;
  onSave: (d: Data) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [edit, setEdit] = useState<{
      kind: "categories" | "classifications";
      id: string;
      name: string;
    } | null>(null),
    [newCategory, setNewCategory] = useState(""),
    [newType, setNewType] = useState("");
  async function run(fn: () => Promise<void>) {
    try {
      await fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function add(kind: "categories" | "classifications", name: string) {
    if (!name.trim()) return;
    if (
      data[kind].some(
        (x) => x.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
      )
    )
      throw Error("Ese nombre ya existe.");
    await onSave({
      ...data,
      [kind]: [...data[kind], { id: uuid(), name: name.trim() }],
    });
    if (kind === "categories") setNewCategory("");
    else setNewType("");
  }
  return (
    <>
      <div className="settings-grid">
        {(["categories", "classifications"] as const).map((kind) => (
          <section className="panel" key={kind}>
            <p className="eyebrow">
              {kind === "categories" ? "TU ARMARIO" : "TUS COMBINACIONES"}
            </p>
            <h2>
              {kind === "categories"
                ? "Categorías de prendas"
                : "Estilos de outfits"}
            </h2>
            <div className="taxonomy-list">
              {data[kind].map((c) => {
                const count =
                  kind === "categories"
                    ? data.garments.filter((g) => g.categoryId === c.id).length
                    : data.outfits.filter((o) => o.classificationId === c.id)
                        .length;
                return (
                  <div key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <span className="small muted">
                        {count} {kind === "categories" ? "prendas" : "outfits"}
                      </span>
                    </div>
                    <button
                      className="icon"
                      aria-label={`Editar categoría ${c.name}`}
                      disabled={!canEdit}
                      onClick={() => setEdit({ kind, id: c.id, name: c.name })}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon danger"
                      aria-label={`Eliminar categoría ${c.name}`}
                      disabled={!canEdit || data[kind].length === 1}
                      onClick={() => {
                        const target = data[kind].find((x) => x.id !== c.id)!;
                        if (
                          !confirm(
                            `¿Eliminar «${c.name}»?${count ? ` ${count} registros se moverán a «${target.name}».` : ""}`,
                          )
                        )
                          return;
                        void run(() =>
                          onSave({
                            ...data,
                            [kind]: data[kind].filter((x) => x.id !== c.id),
                            ...(kind === "categories"
                              ? {
                                  garments: data.garments.map((g) =>
                                    g.categoryId === c.id
                                      ? {
                                          ...g,
                                          categoryId: target.id,
                                          updatedAt: now(),
                                        }
                                      : g,
                                  ),
                                }
                              : {
                                  outfits: data.outfits.map((o) =>
                                    o.classificationId === c.id
                                      ? {
                                          ...o,
                                          classificationId: target.id,
                                          updatedAt: now(),
                                        }
                                      : o,
                                  ),
                                }),
                          }),
                        );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() =>
                  add(kind, kind === "categories" ? newCategory : newType),
                );
              }}
            >
              <label className="grow">
                {kind === "categories" ? "Nueva categoría" : "Nuevo estilo"}
                <input
                  required
                  maxLength={120}
                  value={kind === "categories" ? newCategory : newType}
                  onChange={(e) =>
                    kind === "categories"
                      ? setNewCategory(e.target.value)
                      : setNewType(e.target.value)
                  }
                />
              </label>
              <button
                className="secondary"
                disabled={!canEdit}
                aria-label={
                  kind === "categories" ? "Añadir categoría" : "Añadir estilo"
                }
              >
                <Plus size={18} />
              </button>
            </form>
          </section>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {edit && (
        <Modal title="Cambiar nombre" close={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (!edit.name.trim()) throw Error("Escribe un nombre.");
                if (
                  data[edit.kind].some(
                    (c) =>
                      c.id !== edit.id &&
                      c.name.toLocaleLowerCase() ===
                        edit.name.trim().toLocaleLowerCase(),
                  )
                )
                  throw Error("Ese nombre ya existe.");
                await onSave({
                  ...data,
                  [edit.kind]: data[edit.kind].map((c) =>
                    c.id === edit.id ? { ...c, name: edit.name.trim() } : c,
                  ),
                });
                setEdit(null);
              });
            }}
          >
            <label>
              Nombre
              <input
                autoFocus
                required
                value={edit.name}
                maxLength={120}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <div className="modal-footer">
              <button className="primary" disabled={!canEdit}>
                Guardar nombre
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
