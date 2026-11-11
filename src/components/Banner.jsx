const KIND = {
  ok: { icon: "✓", cls: "ok" },       // dukungan tercatat
  warn: { icon: "▲", cls: "warn" },   // di luar Sidoarjo / tanpa sinyal
  err: { icon: "!", cls: "err" },     // belum terkirim
};
/** Pemberitahuan kondisi khusus: bentuk ikon + teks (bukan hanya warna). */
export default function Banner({ kind = "ok", title, children, actions }) {
  const k = KIND[kind];
  return (
    <div className={`pg-banner2 ${k.cls}`} role={kind === "ok" ? "status" : "alert"}>
      <span className="pg-bicon" aria-hidden="true">{k.icon}</span>
      <div><b>{title}</b><p>{children}</p>{actions && <div className="pg-bact">{actions}</div>}</div>
    </div>
  );
}
