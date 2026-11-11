import { useState } from "react";
import { VIEWBOX, KECAMATAN } from "../data/kecamatan";

/**
 * Peta 18 kecamatan Sidoarjo (dari public/sidoarjo-kecamatan.geojson).
 * highlight   : id kecamatan yang digelapkan + diberi nomor (urutan array = nomor)
 * ring        : id kecamatan yang diberi lingkaran putus-putus (pembanding)
 * interactive : hover menampilkan nama kecamatan
 */
export default function SidoarjoMap({ className = "", fill = "#0f7f78", stroke = "#fff", highlight = [], ring, interactive = false }) {
  const [hover, setHover] = useState(null);
  const find = (id) => KECAMATAN.find((k) => k.id === id);
  const r = ring && find(ring);

  return (
    <div className="mapbox">
      <svg className={className} viewBox={VIEWBOX} role="img" aria-label="Peta Kabupaten Sidoarjo">
        {KECAMATAN.map((k) => (
          <path
            key={k.id}
            d={k.d}
            className={`kec${interactive ? " hov" : ""}`}
            fill={highlight.includes(k.id) ? "#0a4a46" : fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeOpacity=".75"
            onMouseEnter={() => interactive && setHover(k.name)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {r && <circle cx={r.cx} cy={r.cy} r="42" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="6 5" />}
        {highlight.map((id, i) => {
          const k = find(id);
          return k ? (
            <g key={id} className="badge">
              <circle cx={k.cx} cy={k.cy} r="16" fill="#fff" />
              <text x={k.cx} y={k.cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#0a4a46">{i + 1}</text>
            </g>
          ) : null;
        })}
      </svg>
      {interactive && <span className={`tip${hover ? " show" : ""}`}>{hover || "Arahkan ke kecamatan"}</span>}
    </div>
  );
}
