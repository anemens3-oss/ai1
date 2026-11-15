import type { DesignDocument, GeneratedSite, ProjectMeta } from '../types/design';
import { countElements } from './document';

// Thin IndexedDB wrapper — local project persistence.
// Swap the internals for a REST/Supabase client later; the API stays.

const DB_NAME = 'sitecraft';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents');
      if (!db.objectStoreNames.contains('generated')) db.createObjectStore('generated');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function saveDocument(doc: DesignDocument): Promise<void> {
  doc.updatedAt = Date.now();
  await tx('documents', 'readwrite', (s) => s.put(doc, doc.id));
}

export async function loadDocument(id: string): Promise<DesignDocument | null> {
  const doc = await tx<DesignDocument | undefined>('documents', 'readonly', (s) => s.get(id));
  return doc ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
  await tx('documents', 'readwrite', (s) => s.delete(id));
  await tx('generated', 'readwrite', (s) => s.delete(id));
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await tx<DesignDocument[]>('documents', 'readonly', (s) => s.getAll() as IDBRequest<DesignDocument[]>);
  return (all ?? [])
    .map((d) => ({
      id: d.id,
      name: d.name,
      templateId: d.templateId,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      elementCount: countElements(d),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveGenerated(docId: string, site: GeneratedSite): Promise<void> {
  await tx('generated', 'readwrite', (s) => s.put(site, docId));
}

export async function loadGenerated(docId: string): Promise<GeneratedSite | null> {
  const site = await tx<GeneratedSite | undefined>('generated', 'readonly', (s) => s.get(docId));
  return site ?? null;
}
