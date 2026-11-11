import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { renderToStaticMarkup } from "react-dom/server";
import StatusShape from "./StatusShape";
import { STATUS } from "../data/status";

const FALLBACK = [-7.4478, 112.7183];
const TILE = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const iconFor = (status, sel) => {
  const s = sel ? 40 : 30;
  return L.divIcon({ className: "pg-mk", html: renderToStaticMarkup(<StatusShape status={status} size={s} ring={sel} />), iconSize: [s, s] });
};

export default function ReportMap({ geo, reports, selectedId, onSelect, chronic, showChronic, showBorders, userLoc, focus, onTileError }) {
  const el = useRef(null);
  const m = useRef({});

  useEffect(() => {
    const map = L.map(el.current, { center: FALLBACK, zoom: 11, minZoom: 10, maxZoom: 18 });
    L.tileLayer(TILE, { attribution: "© OpenStreetMap contributors", maxZoom: 18 })
      .on("tileerror", () => onTileError && onTileError()).addTo(map);
    map.on("zoomend", () => el.current && el.current.classList.toggle("zl", map.getZoom() >= 12));
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 45, showCoverageOnHover: false,
      iconCreateFunction: (c) => L.divIcon({ className: "pg-cl", html: `<span>${c.getChildCount()}</span>`, iconSize: [40, 40] }),
    }).addTo(map);
    m.current = { map, cluster, ring: L.layerGroup().addTo(map), border: null };
    return () => { map.remove(); m.current = {}; };
  }, []);

  // batas kecamatan dari GeoJSON
  useEffect(() => {
    const { map } = m.current;
    if (!map || !geo) return;
    if (m.current.border) map.removeLayer(m.current.border);
    const layer = L.geoJSON(geo, {
      style: { color: "#087878", weight: 1.2, fillColor: "#B8D8D8", fillOpacity: 0.28 },
      onEachFeature: (f, l) => l.bindTooltip(f.properties.name, { permanent: true, direction: "center", className: "kec-label" }),
    });
    m.current.border = layer;
    const b = layer.getBounds();
    map.fitBounds(b, { padding: [10, 10] });
    map.setMaxBounds(b.pad(0.4));
    if (showBorders) layer.addTo(map);
  }, [geo]);

  useEffect(() => {
    const { map, border } = m.current;
    if (!map || !border) return;
    showBorders ? border.addTo(map) : map.removeLayer(border);
  }, [showBorders, geo]);

  // marker + cluster
  useEffect(() => {
    const { cluster } = m.current;
    if (!cluster) return;
    cluster.clearLayers();
    reports.forEach((r) => {
      const sel = r.id === selectedId;
      const mk = L.marker([r.lat, r.lng], { icon: iconFor(r.status, sel), keyboard: true, zIndexOffset: sel ? 1000 : 0, title: `${r.category}, ${STATUS[r.status].long}` });
      mk.on("click", () => onSelect(r.id));
      cluster.addLayer(mk);
    });
  }, [reports, selectedId]);

  // lokasi pengguna: tandai posisi lalu arahkan peta ke laporan terdekat
  useEffect(() => {
    const { map } = m.current;
    if (!map) return;
    if (m.current.me) { map.removeLayer(m.current.me); m.current.me = null; }
    if (!userLoc) return;
    m.current.me = L.circleMarker([userLoc.lat, userLoc.lng], { radius: 9, color: "#fff", weight: 3, fillColor: "#246BFD", fillOpacity: 1 })
      .bindTooltip("Lokasimu").addTo(map);
    const pts = [[userLoc.lat, userLoc.lng], ...(focus || []).map((r) => [r.lat, r.lng])];
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
  }, [userLoc]);

  // cincin titik kronis (putus-putus)
  useEffect(() => {
    const { ring } = m.current;
    if (!ring) return;
    ring.clearLayers();
    if (showChronic) chronic.forEach((c) => L.circleMarker([c.lat, c.lng], { radius: 24, color: "#F59E0B", weight: 3, dashArray: "5 5", fill: false, interactive: false }).addTo(ring));
  }, [chronic, showChronic]);

  return <div ref={el} className="pg-leaflet" role="application" aria-label="Peta laporan Sidoarjo. Alternatif: tombol Daftar." />;
}
