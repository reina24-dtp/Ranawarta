import { statusMeta } from "../data/status";

/** Ikon status: BENTUK berbeda untuk tiap status (bukan hanya warna). */
export default function StatusShape({ status, size = 18, ring = false }) {
  const { color, shape } = statusMeta(status);
  const W = { stroke: "#fff", strokeWidth: 2.2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ring && <circle cx="12" cy="12" r="11" fill="#fff" stroke="#246BFD" strokeWidth="2" />}
      {shape === "circle" && <circle cx="12" cy="12" r="7" fill={color} />}
      {shape === "square" && <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" fill={color} />}
      {shape === "triangle" && <path d="M12 4.5 20 18.5H4z" fill={color} />}
      {shape === "diamond" && <path d="M12 3.5 20.5 12 12 20.5 3.5 12z" fill={color} />}
      {shape === "check" && (<><circle cx="12" cy="12" r="8" fill={color} /><path d="M8 12.4l2.8 2.8L16 9.6" {...W} /></>)}
      {shape === "alert" && (<><circle cx="12" cy="12" r="8" fill={color} /><path d="M12 7.8v5" {...W} /><circle cx="12" cy="16" r="1.1" fill="#fff" /></>)}
    </svg>
  );
}
