import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToStaticMarkup } from "react-dom/server";
import StatusShape from "./StatusShape";
import { STATUS } from "../data/status";
import { loadGeo } from "../lib/geo";

const FALLBACK = [-7.4478, 112.7183];
const TILE = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const QUIET_KEC = ["jabon", "sedati", "balongbendo"];

const createReportIcon = (status, isDisputed, isSelected) => {
  const size = isSelected ? 36 : isDisputed ? 32 : 26;
  const markup = (
    <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
      <StatusShape status={status} size={size} ring={isSelected || isDisputed} />
      {isDisputed && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#DC2626",
            color: "#fff",
            fontSize: "9px",
            fontWeight: "bold",
            borderRadius: "50%",
            width: "15px",
            height: "15px",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
          }}
        >
          !
        </span>
      )}
    </div>
  );

  return L.divIcon({
    className: "admin-marker-icon",
    html: renderToStaticMarkup(markup),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export default function AdminMap({ reports = [], selectedCode, onSelectReport, onQuickStatusChange }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const markersLayer = useRef(null);
  const geoLayer = useRef(null);
  const fittedGeo = useRef(false);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'disputed' | 'quiet'
  const [geoData, setGeoData] = useState(null);

  // Inisialisasi peta
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const map = L.map(mapRef.current, {
      center: FALLBACK,
      zoom: 11,
      minZoom: 8,
      maxZoom: 18
    });

    L.tileLayer(TILE, {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    mapInst.current = map;

    // Muat GeoJSON batas kecamatan
    loadGeo().then((geo) => {
      if (geo) setGeoData(geo);
    }).catch(() => {});

    return () => {
      map.remove();
      mapInst.current = null;
    };
  }, []);

  // Update poligon GeoJSON
  useEffect(() => {
    const map = mapInst.current;
    if (!map || !geoData) return;

    if (geoLayer.current) {
      map.removeLayer(geoLayer.current);
    }

    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const id = feature?.properties?.id;
        const isQuiet = QUIET_KEC.includes(id);
        const isTaman = id === "taman";

        if (isQuiet) {
          return {
            color: "#0F766E",
            weight: 2.2,
            fillColor: "#20B8A6",
            fillOpacity: filterMode === "quiet" ? 0.45 : 0.22,
            dashArray: "4, 4"
          };
        }
        if (isTaman) {
          return {
            color: "#9A3412",
            weight: 1.5,
            fillColor: "#FDBA74",
            fillOpacity: 0.15,
            dashArray: "3, 3"
          };
        }
        return {
          color: "#087878",
          weight: 1.1,
          fillColor: "#B8D8D8",
          fillOpacity: filterMode === "quiet" ? 0.08 : 0.18
        };
      },
      onEachFeature: (feature, l) => {
        const id = feature?.properties?.id;
        const name = feature?.properties?.name;
        const isQuiet = QUIET_KEC.includes(id);
        const kecReports = reports.filter((r) => r.kec === id);

        l.bindTooltip(
          `${name} ${isQuiet ? "(Wilayah Sunyi)" : ""}<br/><span style="font-size:11px;opacity:0.85">${kecReports.length} laporan</span>`,
          { permanent: false, direction: "center" }
        );
      }
    }).addTo(map);

    geoLayer.current = layer;
    if (!fittedGeo.current) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        requestAnimationFrame(() => {
          if (!mapInst.current) return;
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
          fittedGeo.current = true;
        });
      }
    }
  }, [geoData, filterMode, reports]);

  // Update Marker Laporan
  useEffect(() => {
    const map = mapInst.current;
    const group = markersLayer.current;
    if (!map || !group) return;

    group.clearLayers();

    // Saring laporan berdasarkan filterMode
    const filtered = reports.filter((r) => {
      if (!r.lat || !r.lng) return false;
      if (filterMode === "disputed") {
        return r.status === "disengketakan" || r.needs_review;
      }
      if (filterMode === "quiet") {
        return QUIET_KEC.includes(r.kec);
      }
      return true;
    });

    filtered.forEach((r) => {
      const isDisputed = r.status === "disengketakan" || r.needs_review;
      const isSelected = r.code === selectedCode;
      const icon = createReportIcon(r.status, isDisputed, isSelected);

      const marker = L.marker([r.lat, r.lng], { icon });

      // Konten Popup interaktif
      const popupDiv = document.createElement("div");
      popupDiv.style.minWidth = "220px";
      popupDiv.style.fontFamily = "Manrope, sans-serif";
      popupDiv.innerHTML = `
        <div style="margin-bottom:6px">
          <span style="display:inline-block;background:#E0F0F0;padding:2px 8px;border-radius:4px;font-weight:700;font-size:12px;color:#16324F">${r.code}</span>
          ${isDisputed ? '<span style="background:#FEE2E2;color:#991B1B;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-left:4px">DISENGKETAKAN</span>' : ''}
          ${QUIET_KEC.includes(r.kec) ? '<span style="background:#CCFBF1;color:#0F766E;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-left:4px">WILAYAH SUNYI</span>' : ''}
        </div>
        <h4 style="margin:0 0 4px;font-size:14px;color:#16324F">${r.category}</h4>
        <p style="margin:0 0 6px;font-size:12px;color:#51657A">Kecamatan: <b>${r.kecName || r.kec}</b></p>
        <p style="margin:0 0 8px;font-size:12px;color:#51657A">Status: <b>${STATUS[r.status]?.long || r.status}</b></p>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button id="btn-select-${r.code}" style="flex:1;background:#246BFD;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer">Tinjau Detail</button>
          <button id="btn-status-${r.code}" style="background:#0F766E;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer">Ubah Status</button>
        </div>
      `;

      marker.bindPopup(popupDiv);

      marker.on("popupopen", () => {
        const btnSel = document.getElementById(`btn-select-${r.code}`);
        const btnSt = document.getElementById(`btn-status-${r.code}`);
        if (btnSel) {
          btnSel.onclick = () => {
            if (onSelectReport) onSelectReport(r.code);
            map.closePopup();
          };
        }
        if (btnSt) {
          btnSt.onclick = () => {
            if (onQuickStatusChange) onQuickStatusChange(r);
            map.closePopup();
          };
        }
      });

      marker.addTo(group);
    });
  }, [reports, filterMode, selectedCode, onSelectReport, onQuickStatusChange]);

  return (
    <div className="admin-map-container">
      {/* Kontrol Filter Peta Admin */}
      <div className="admin-map-controls">
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#16324F" }}>Layer Peta:</span>
        <button
          type="button"
          className={`adm-pill-sm ${filterMode === "all" ? "active" : ""}`}
          onClick={() => setFilterMode("all")}
          style={{
            background: filterMode === "all" ? "#16324F" : "#F4F7FB",
            color: filterMode === "all" ? "#fff" : "#16324F",
            border: "1px solid #B8D8D8",
            padding: "5px 12px",
            borderRadius: "99px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Semua Laporan ({reports.length})
        </button>

        <button
          type="button"
          className={`adm-pill-sm ${filterMode === "disputed" ? "active" : ""}`}
          onClick={() => setFilterMode("disputed")}
          style={{
            background: filterMode === "disputed" ? "#DC2626" : "#FEF2F2",
            color: filterMode === "disputed" ? "#fff" : "#991B1B",
            border: "1px solid #FECACA",
            padding: "5px 12px",
            borderRadius: "99px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Disengketakan ({reports.filter((r) => r.status === "disengketakan" || r.needs_review).length})
        </button>

        <button
          type="button"
          className={`adm-pill-sm ${filterMode === "quiet" ? "active" : ""}`}
          onClick={() => setFilterMode("quiet")}
          style={{
            background: filterMode === "quiet" ? "#0F766E" : "#F0FDFA",
            color: filterMode === "quiet" ? "#fff" : "#0F766E",
            border: "1px solid #99F6E4",
            padding: "5px 12px",
            borderRadius: "99px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Wilayah Sunyi (Jabon, Sedati, Balongbendo)
        </button>
      </div>

      {/* Wadah Kanvas Leaflet */}
      <div
        ref={mapRef}
        className="admin-map-canvas"
        style={{
          height: "clamp(360px, 58vh, 620px)"
        }}
      />

      {/* Legenda Bawah */}
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          alignItems: "center",
          fontSize: "12px",
          color: "#51657A"
        }}
      >
        <span style={{ fontWeight: "700", color: "#16324F" }}>Legenda Peta:</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 12, height: 12, background: "#6B7C93", borderRadius: "50%", display: "inline-block" }} />
          Diterima
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 12, height: 12, background: "#2563EB", display: "inline-block" }} />
          Diverifikasi
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 12, height: 12, background: "#B45309", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", display: "inline-block" }} />
          Dikerjakan
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 12, height: 12, background: "#0F766E", transform: "rotate(45deg)", display: "inline-block" }} />
          Selesai (Petugas)
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 12, height: 12, background: "#15803D", borderRadius: "2px", display: "inline-block" }} />
          Terkonfirmasi Warga
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 14, height: 14, background: "#DC2626", borderRadius: "50%", color: "#fff", fontSize: "10px", textAlign: "center", lineHeight: "14px", fontWeight: "bold" }}>!</span>
          Disengketakan
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
          <span style={{ width: 16, height: 10, background: "#20B8A6", border: "1.5px dashed #0F766E", display: "inline-block", borderRadius: "2px" }} />
          Poligon Wilayah Sunyi (Kepadatan Rendah)
        </span>
      </div>
    </div>
  );
}
