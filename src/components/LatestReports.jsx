import { useEffect, useRef, useState } from "react";
import { samplePhoto as photo } from "../lib/samplePhoto";
import StatusShape from "./StatusShape";
import { STATUS } from "../data/status";
import info from "../data/kecamatan-info.json";
import { listReports, getInteraction, doSupport } from "../lib/reportsRepo";
import "./latest.css";

const KEC = Object.fromEntries(info.map((k) => [k.id, k.name]));
const LIMIT = 10; // overview: 10 laporan terbaru (urut waktu, tanpa lokasi)

// Foto contoh per kategori (ilustrasi lokal, bukan hotlink). Berlabel DATA CONTOH.

const ago = (date) => {
  const n = Math.max(0, Math.round((Date.now() - +new Date(date)) / 864e5));
  return n === 0 ? "hari ini" : n === 1 ? "kemarin" : `${n} hari lalu`;
};

export default function LatestReports() {
  const [rows, setRows] = useState(null);
  const [, setTick] = useState(0);
  const track = useRef(null);

  useEffect(() => {
    listReports()
      .then((l) => setRows([...l].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, LIMIT)))
      .catch(() => setRows([]));
  }, []);

  const slide = (dir) => { const el = track.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" }); };
  const toMap = () => { window.location.hash = "/peta"; window.scrollTo(0, 0); };

  return (
    <section id="laporan-terbaru" className="latest" aria-labelledby="lt-title">
      <div className="lt-head">
        <div>
          <small className="eyebrow">LAPORAN TERBARU</small>
          <h3 id="lt-title" className="spaced">Laporan terbaru warga</h3>
          <p>Sepuluh laporan terakhir di Sidoarjo. Kalau masalah di sekitarmu sudah ada di sini, dukung saja tanpa foto ulang. <span className="lt-pill">DATA CONTOH</span></p>
        </div>
        <div className="lt-arrows">
          <button onClick={() => slide(-1)} aria-label="Geser ke kiri"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg></button>
          <button onClick={() => slide(1)} aria-label="Geser ke kanan"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>

      {!rows && <p className="lt-note" role="status">Memuat laporan…</p>}
      {rows && rows.length === 0 && <p className="lt-note" role="status">Belum ada laporan untuk ditampilkan.</p>}
      {rows && rows.length > 0 && (
        <ul className="lt-track" ref={track} tabIndex={0} aria-label="Laporan terbaru. Geser untuk melihat laporan lainnya.">
          {rows.map((r) => {
            const it = getInteraction(r.id);
            return (
              <li key={r.id} className="lt-card">
                <div className="lt-ph">
                  <img src={r.photo_url || photo(r.category)} alt={r.photo_url ? `Foto laporan ${r.category}` : `Foto contoh laporan ${r.category}`} loading="lazy" />
                  {r.is_demo && <span className="lt-demo">DATA CONTOH</span>}
                </div>
                <div className="lt-body">
                  <b>{r.category}</b>
                  <p className="lt-meta">Kec. {KEC[r.kec]} · {ago(r.date)}</p>
                  <div className="lt-row">
                    <span className="lt-chip"><StatusShape status={r.status} size={16} />{STATUS[r.status].label}</span>
                    <span>{r.support + (it.support ? 1 : 0)} dukungan</span>
                  </div>
                  <button className="lt-btn" disabled={it.support} onClick={async () => { try { await doSupport(r.id); setTick((t) => t + 1); } catch (e) { window.alert(e.message); } }}>
                    {it.support ? "Didukung" : "Dukung"}
                  </button>
                  {it.support && <span className="lt-ok" role="status">Dukunganmu tercatat.</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="lt-foot">
        <button className="lt-link" onClick={toMap}>Lihat semua di peta →</button>
        <span className="lt-note">Di peta, laporan bisa diurutkan dari yang terdekat denganmu.</span>
      </div>
    </section>
  );
}
