import { CHRONIC_RADIUS_M, CHRONIC_DAYS, CHRONIC_MIN } from "../config";
const R = 6371000, rad = (d) => (d * Math.PI) / 180;
export const dist = (a, b) => {
  const dLa = rad(b.lat - a.lat), dLn = rad(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
// Kelompokkan laporan kategori sama: radius 50 m, rentang 6 bulan, minimal 3 laporan.
export function findChronic(reports) {
  const used = new Set(), out = [];
  for (const r of reports) {
    if (used.has(r.id)) continue;
    const g = reports.filter((x) => x.category === r.category && !used.has(x.id) && dist(r, x) <= CHRONIC_RADIUS_M);
    const t = g.map((x) => +new Date(x.date));
    if (g.length >= CHRONIC_MIN && (Math.max(...t) - Math.min(...t)) / 864e5 <= CHRONIC_DAYS) {
      g.forEach((x) => used.add(x.id));
      out.push({ lat: g.reduce((s, x) => s + x.lat, 0) / g.length, lng: g.reduce((s, x) => s + x.lng, 0) / g.length, count: g.length, category: r.category });
    }
  }
  return out;
}
