// Penyimpanan foto di IndexedDB (kunci -> Blob)
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open("ranawarta", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("photos");
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const q = fn(db.transaction("photos", mode).objectStore("photos")); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
export const putPhoto = (key, blob) => tx("readwrite", (s) => s.put(blob, key));
export const getPhoto = (key) => tx("readonly", (s) => s.get(key)).catch(() => null);
export const delPhoto = (key) => tx("readwrite", (s) => s.delete(key)).catch(() => null);
export const blobToDataUrl = (b) => new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
