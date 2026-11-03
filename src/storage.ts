import {
  heads,
  now,
  uuid,
  validateData,
  RevisionSchema,
  type Data,
  type Revision,
} from "./domain";
export interface Store {
  kind: "demo" | "cloud";
  list(): Promise<Revision[]>;
  append(r: Revision): Promise<void>;
  putPhoto(blob: Blob, area: string): Promise<string>;
  getPhoto(key: string): Promise<Blob>;
}
export class ConflictError extends Error {
  constructor(public versions: Revision[]) {
    super(
      "Hay cambios de otro dispositivo. Tu versión se conserva; resuelve el conflicto.",
    );
  }
}
export async function publish(
  store: Store,
  data: Data,
  parents: string[],
  resolve = false,
): Promise<Revision[]> {
  validateData(data);
  const before = heads(await store.list());
  if (
    !resolve &&
    (before.length > 1 ||
      before
        .map((x) => x.id)
        .sort()
        .join("|") !== [...parents].sort().join("|"))
  )
    throw new ConflictError(before);
  if (
    resolve &&
    before
      .map((x) => x.id)
      .sort()
      .join("|") !== [...parents].sort().join("|")
  )
    throw new ConflictError(before);
  const revision: Revision = {
    id: uuid(),
    parents: [...parents],
    createdAt: now(),
    device: deviceId(),
    data: structuredClone(data),
  };
  await store.append(revision);
  // Always include own confirmed write even when directory listing lags.
  const listed = await store.list();
  if (!listed.some((x) => x.id === revision.id)) listed.push(revision);
  return heads(listed);
}
function deviceId() {
  let id = sessionStorage.getItem("armario-device");
  if (!id) {
    id = uuid();
    sessionStorage.setItem("armario-device", id);
  }
  return id;
}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("armario-demo-v1", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("revisions", { keyPath: "id" });
      r.result.createObjectStore("photos");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function transact<T>(
  table: string,
  mode: IDBTransactionMode,
  act: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(table, mode);
    const req = act(tx.objectStore(table));
    tx.oncomplete = () => {
      d.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      d.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      d.close();
      reject(tx.error);
    };
  });
}
export class DemoStore implements Store {
  kind = "demo" as const;
  async list() {
    return (await transact("revisions", "readonly", (s) => s.getAll())).map(
      (r) => RevisionSchema.parse(r),
    );
  }
  async append(r: Revision) {
    await transact("revisions", "readwrite", (s) => s.add(r));
  }
  async putPhoto(blob: Blob) {
    const key = uuid();
    await transact("photos", "readwrite", (s) => s.add(blob, key));
    return key;
  }
  async getPhoto(key: string) {
    const blob = await transact("photos", "readonly", (s) => s.get(key));
    if (!blob) throw Error("Foto de prueba no encontrada.");
    return blob as Blob;
  }
}
