// Deteksi kecamatan: point-in-polygon (ray casting) terhadap GeoJSON. Mendukung Polygon & MultiPolygon.
let memo;
export function loadGeo() {
  memo = memo || fetch(`${import.meta.env.BASE_URL}data/sidoarjo-kecamatan.geojson`).then((r) => { if (!r.ok) throw new Error("geo"); return r.json(); });
  memo.catch(() => { memo = null; });
  return memo;
}
const inRing = (x, y, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const inPoly = (x, y, p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h));
export function detectKecamatan(lat, lng, geo) {
  if (!geo) return null;
  for (const f of geo.features) {
    const g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    if (polys.some((p) => inPoly(lng, lat, p))) return { id: f.properties.id, name: f.properties.name };
  }
  return null;
}
