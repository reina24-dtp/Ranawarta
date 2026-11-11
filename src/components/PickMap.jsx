import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const FALLBACK = [-7.4478, 112.7183];
const TILE = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const pin = L.divIcon({
  className: "pg-pinwrap",
  html: '<span class="pg-pin" aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/** Peta pemilih lokasi: ketuk peta atau geser pin. Batas kecamatan dari GeoJSON (tetap tampil tanpa tile/offline). */
export default function PickMap({ active = true, geo, pos, onPick, onTileError }) {
  const el = useRef(null);
  const m = useRef({});
  const cb = useRef(onPick);
  cb.current = onPick;

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      center: FALLBACK,
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      scrollWheelZoom: false,
    });

    L.tileLayer(TILE, {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    })
      .on("tileerror", () => onTileError && onTileError())
      .addTo(map);

    map.on("click", (e) => cb.current(e.latlng.lat, e.latlng.lng));

    m.current = { map, marker: null, geoLayer: null, fitted: false, hasPos: false };

    // ResizeObserver menangani perubahan ukuran kontainer saat tab/panel berganti di layar kecil
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && m.current.map) {
            m.current.map.invalidateSize();
            if (m.current.marker && m.current.hasPos) {
              m.current.map.panTo(m.current.marker.getLatLng());
            } else if (m.current.geoLayer && !m.current.fitted) {
              try {
                m.current.map.fitBounds(m.current.geoLayer.getBounds(), { padding: [12, 12] });
                m.current.fitted = true;
              } catch (e) {
                /* abaikan */
              }
            }
          }
        }
      });
      ro.observe(el.current);
    }

    return () => {
      if (ro) ro.disconnect();
      map.remove();
      m.current = {};
    };
  }, []);

  // Batas kecamatan GeoJSON
  useEffect(() => {
    const { map } = m.current;
    if (!map || !geo) return;
    if (m.current.geoLayer) {
      map.removeLayer(m.current.geoLayer);
    }
    const layer = L.geoJSON(geo, {
      style: { color: "#087878", weight: 1.2, fillColor: "#B8D8D8", fillOpacity: 0.25 },
      interactive: false,
    }).addTo(map);
    m.current.geoLayer = layer;

    if (el.current && el.current.clientWidth > 0 && el.current.clientHeight > 0 && !pos) {
      try {
        map.fitBounds(layer.getBounds(), { padding: [12, 12] });
        m.current.fitted = true;
      } catch (e) {
        /* abaikan */
      }
    }

    return () => {
      if (map && layer) map.removeLayer(layer);
    };
  }, [geo]);

  // Marker pin lokasi
  useEffect(() => {
    const { map } = m.current;
    if (!map || !pos) return;
    m.current.hasPos = true;

    if (!m.current.marker) {
      const mk = L.marker([pos.lat, pos.lng], {
        icon: pin,
        draggable: true,
        keyboard: true,
        title: "Pin lokasi (geser untuk memindahkan)",
      }).addTo(map);

      mk.on("dragend", () => {
        const p = mk.getLatLng();
        cb.current(p.lat, p.lng);
      });
      m.current.marker = mk;
    } else {
      m.current.marker.setLatLng([pos.lat, pos.lng]);
    }

    if (el.current && el.current.clientWidth > 0) {
      if (map.getZoom() < 13) {
        map.setView([pos.lat, pos.lng], 14);
      } else {
        map.panTo([pos.lat, pos.lng]);
      }
    }
  }, [pos]);

  // Ketika langkah aktif atau posisi diperbarui (terutama pada tampilan layar kecil/ponsel)
  useEffect(() => {
    const isVisible = active || (el.current && el.current.clientWidth > 0);
    if (!isVisible) return;
    const { map } = m.current;
    if (!map) return;

    const refresh = () => {
      if (!m.current.map) return;
      m.current.map.invalidateSize();
      if (pos) {
        if (m.current.map.getZoom() < 13) {
          m.current.map.setView([pos.lat, pos.lng], 14);
        } else {
          m.current.map.panTo([pos.lat, pos.lng]);
        }
      } else if (m.current.geoLayer) {
        try {
          m.current.map.fitBounds(m.current.geoLayer.getBounds(), { padding: [12, 12] });
          m.current.fitted = true;
        } catch (e) {
          /* abaikan */
        }
      }
    };

    refresh();
    const t1 = setTimeout(refresh, 60);
    const t2 = setTimeout(refresh, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, pos]);

  return (
    <div
      ref={el}
      className="pg-pickmap"
      role="application"
      aria-label="Peta untuk menandai lokasi. Ketuk peta atau geser pin."
    />
  );
}
