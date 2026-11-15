// Where progress photo images live in the browser and the home-screen web app: IndexedDB on this device.
// Nothing here uploads anything. Images are scaled down first so a phone's storage is not eaten by full-size shots.
import { fitWithin } from '@/domain/photos';

const DB = 'liftbook-photos';
const STORE = 'photos';
const MAX_EDGE = 1600;
interface Row { type: string; data: ArrayBuffer }
const urls = new Map<string, string>();

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('Photo storage is not available.'));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const rq = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(rq.result); };
    const fail = () => { db.close(); reject(t.error ?? rq.error ?? new Error('Photo storage failed.')); };
    t.onerror = fail;
    t.onabort = fail;
  });
}

const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('That file could not be read as a photo.'));
  img.src = src;
});

/** Scales the picked image down, re-encodes it as JPEG and stores it on this device. Returns the stored size. */
export async function savePhoto(id: string, sourceUri: string, _w: number, _h: number): Promise<{ w: number; h: number }> {
  const img = await load(sourceUri);
  const size = fitWithin(img.naturalWidth, img.naturalHeight, MAX_EDGE);
  if (size.w <= 0 || size.h <= 0) throw new Error('That file could not be read as a photo.');
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not prepare the photo.');
  ctx.drawImage(img, 0, 0, size.w, size.h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('This browser could not prepare the photo.');
  // Stored as raw bytes: older iPhone browsers were unreliable with Blobs in IndexedDB.
  const row: Row = { type: blob.type, data: await blob.arrayBuffer() };
  await run('readwrite', (s) => s.put(row, id));
  return size;
}

/** A URL an Image can show, or null if the photo is no longer stored. */
export async function photoUri(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const row = (await run('readonly', (s) => s.get(id))) as Row | undefined;
  if (!row) return null;
  const url = URL.createObjectURL(new Blob([row.data], { type: row.type }));
  urls.set(id, url);
  return url;
}

export async function deletePhoto(id: string): Promise<void> {
  const url = urls.get(id);
  if (url) { URL.revokeObjectURL(url); urls.delete(id); }
  await run('readwrite', (s) => s.delete(id));
}

export async function deleteAllPhotos(): Promise<void> {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
  await run('readwrite', (s) => s.clear());
}
