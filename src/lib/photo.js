// Kompres (sisi panjang maks 1280 px, JPEG ~0,8; re-encode lewat canvas = tanpa EXIF) + cek buram/gelap.
export function quality(canvas) {
  const w = 160, h = Math.max(1, Math.round((canvas.height / canvas.width) * 160));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(canvas, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < g.length; i++) { g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; sum += g[i]; }
  const lum = sum / g.length;
  let n = 0, m = 0, m2 = 0; // varians Laplacian
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const i = y * w + xx, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    n++; m += l; m2 += l * l;
  }
  const lap = m2 / n - (m / n) ** 2;
  return { lap: Math.round(lap), lum: Math.round(lum), blur: lap < 40, dark: lum < 50, bright: lum > 215 };
}
export async function processCanvas(src, capturedAt) {
  const max = 1280, k = Math.min(1, max / Math.max(src.width, src.height));
  const c = document.createElement("canvas"); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
  return { blob, dataUrl: c.toDataURL("image/jpeg", 0.8), capturedAt, quality: quality(c) };
}
export const fileToCanvas = (file) => new Promise((res, rej) => {
  const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0); URL.revokeObjectURL(u); res(c); };
  img.onerror = rej; img.src = u;
});
