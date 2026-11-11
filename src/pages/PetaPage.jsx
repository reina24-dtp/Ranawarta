import { samplePhoto } from "../lib/samplePhoto";
import { useEffect, useMemo, useState } from "react";
import { Navbar, PageHead, PageFooter } from "../components/Layout";
import ReportMap from "../components/ReportMap";
import StatusShape from "../components/StatusShape";
import { STATUS, STATUS_ORDER, CATEGORIES } from "../data/status";
import info from "../data/kecamatan-info.json";
import { listReports, getInteraction, doSupport, doVote } from "../lib/reportsRepo";
import { findChronic, dist } from "../lib/chronic";
import "../pages.css";

const KEC = Object.fromEntries(info.map((k) => [k.id, k.name]));
const fmtDist = (d) => (d < 1000 ? `${Math.max(10, Math.round(d / 10) * 10)} m` : `${(d / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`);
const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

function Select({ label, value, onChange, options }) {
  return (
    <label className="pg-select">
      <span className="pg-sr">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{label}</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}
const Switch = ({ on, set, label }) => (
  <button role="switch" aria-checked={on} className={`pg-switch${on ? " on" : ""}`} onClick={() => set(!on)}><i /><span>{label}</span></button>
);
const Chip = ({ status }) => (
  <span className="pg-chip"><StatusShape status={status} size={16} />{STATUS[status].long}</span>
);

function DetailCard({ r, tick, bump, loc, near, onPick }) {
  if (!r) return (
    <aside className="pg-card pg-detail" aria-live="polite">
      <small className="pg-eyebrow">{loc ? "TERDEKAT DARIMU" : "LAPORAN DIPILIH"}</small>
      {loc && near.length > 0 ? (
        <ul className="pg-near">
          {near.slice(0, 3).map((n) => (
            <li key={n.id}>
              <button onClick={() => onPick(n.id)}>
                <StatusShape status={n.status} size={22} />
                <span><b>{n.category}</b><em>Kec. {KEC[n.kec]} · {fmtDist(n.d)} dari kamu</em></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="pg-muted">Pilih satu laporan di peta.</p>}
    </aside>
  );
  const it = getInteraction(r.id);
  const voteCounts = r.votes || {};
  const votes = [["masih", "Masih ada"], ["diperbaiki", "Sudah diperbaiki"], ["salah", "Lokasi salah"]];
  return (
    <aside className="pg-card pg-detail" aria-live="polite" data-tick={tick}>
      <small className="pg-eyebrow">LAPORAN DIPILIH</small>
      <img className="pg-photo" src={r.photo_url || samplePhoto(r.category, 320, 150)} alt={r.photo_url ? "Foto laporan warga" : "Foto contoh laporan"} />
      <div className="pg-title"><h2>{r.category}</h2><Chip status={r.status} /></div>
      <p className="pg-muted">Kec. {KEC[r.kec]} · {fmtDate(r.date)}{loc && ` · ${fmtDist(dist(loc, r))} dari kamu`}</p>
      <button className="pg-primary" disabled={it.support} aria-pressed={it.support}
        onClick={async () => { try { await doSupport(r.id); bump(); } catch (e) { window.alert(e.message); } }}>
        Saya juga mengalami ini ({r.support + (it.support ? 1 : 0)})
      </button>
      {it.support && <p className="pg-ok" role="status">Dukunganmu tercatat.</p>}
      <div className="pg-votes" role="group" aria-label="Suara warga (hanya penanda, tidak mengubah status)">
        {votes.map(([k, t]) => (
          <button key={k} className={`pg-pill${it.vote === k ? " on" : ""}`} disabled={!!it.vote}
            aria-pressed={it.vote === k} onClick={async () => { try { await doVote(r.id, k); bump(); } catch (e) { window.alert(e.message); } }}>
            {t} {(voteCounts[k] || 0) + (it.vote === k ? 1 : 0)}
          </button>
        ))}
      </div>
      <a className="pg-link" target="_blank" rel="noopener noreferrer"
        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${r.lat},${r.lng}`}>Cek di Street View</a>
    </aside>
  );
}

export default function PetaPage() {
  const [reports, setReports] = useState(null);
  const [geo, setGeo] = useState(null);
  const [geoErr, setGeoErr] = useState(false);
  const [tileErr, setTileErr] = useState(false);
  const [f, setF] = useState({ cat: "", status: "", kec: "", days: "" });
  const [view, setView] = useState("peta");
  const [chronicOn, setChronicOn] = useState(true);
  const [borderOn, setBorderOn] = useState(true);
  const [sel, setSel] = useState(null);
  const [sort, setSort] = useState({ key: "date", dir: -1 });
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [loc, setLoc] = useState(null);
  const [locMsg, setLocMsg] = useState("");

  useEffect(() => { listReports().then(setReports); }, []);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sidoarjo-kecamatan.geojson`)
      .then((r) => { if (!r.ok) throw 0; return r.json(); }).then(setGeo).catch(() => setGeoErr(true));
  }, []);

  const askLoc = () => {
    if (loc) { setLoc(null); setLocMsg(""); setSort({ key: "date", dir: -1 }); return; }
    if (!navigator.geolocation) return setLocMsg("Lokasi tidak tersedia di perangkat ini. Laporan tetap bisa dilihat dari yang terbaru.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocMsg(""); setSort({ key: "d", dir: 1 }); },
      () => setLocMsg("Izin lokasi ditolak. Laporan tetap bisa dilihat dari yang terbaru."), { timeout: 10000 });
  };

  const list = useMemo(() => (reports || []).filter((r) =>
    (!f.cat || r.category === f.cat) && (!f.status || r.status === f.status) && (!f.kec || r.kec === f.kec) &&
    (!f.days || (Date.now() - +new Date(r.date)) / 864e5 <= +f.days)), [reports, f]);
  const chronic = useMemo(() => findChronic(list), [list]);
  const counts = useMemo(() => Object.fromEntries(STATUS_ORDER.map((s) => [s, list.filter((r) => r.status === s).length])), [list]);
  const withD = useMemo(() => (loc ? list.map((r) => ({ ...r, d: dist(loc, r) })) : list), [list, loc]);
  const near = useMemo(() => (loc ? [...withD].sort((a, b) => a.d - b.d) : []), [withD, loc]);
  const rows = useMemo(() => [...withD].sort((a, b) => {
    const A = sort.key === "kec" ? KEC[a.kec] : a[sort.key], B = sort.key === "kec" ? KEC[b.kec] : b[sort.key];
    return (A > B ? 1 : A < B ? -1 : 0) * sort.dir;
  }), [withD, sort]);
  const selected = list.find((r) => r.id === sel) || null;
  const th = (key, label) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</button>
    </th>
  );

  return (
    <div className="pg">
      <Navbar active="peta" />
      <PageHead label="PETA" title="Peta laporan Sidoarjo" />
      <main className="pg-wrap pg-main">
        <div className="pg-bar">
          <button className="pg-pill pg-fold" aria-expanded={open} onClick={() => setOpen(!open)}>Filter</button>
          <div className={`pg-filters${open ? " open" : ""}`}>
            <Select label="Kategori" value={f.cat} onChange={(v) => setF({ ...f, cat: v })} options={CATEGORIES.map((c) => [c, c])} />
            <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUS_ORDER.map((s) => [s, STATUS[s].long])} />
            <Select label="Kecamatan" value={f.kec} onChange={(v) => setF({ ...f, kec: v })} options={info.map((k) => [k.id, k.name])} />
            <Select label="Tanggal" value={f.days} onChange={(v) => setF({ ...f, days: v })} options={[["30", "30 hari terakhir"], ["90", "3 bulan terakhir"], ["180", "6 bulan terakhir"]]} />
          </div>
          <div className="pg-seg" role="group" aria-label="Tampilan">
            <button className={view === "peta" ? "on" : ""} aria-pressed={view === "peta"} onClick={() => setView("peta")}>Peta</button>
            <button className={view === "daftar" ? "on" : ""} aria-pressed={view === "daftar"} onClick={() => setView("daftar")}>Daftar</button>
          </div>
        </div>
        <div className="pg-switches">
          <Switch on={chronicOn} set={setChronicOn} label="Titik kronis" />
          <Switch on={borderOn} set={setBorderOn} label="Batas kecamatan" />
          <button className={`pg-pill${loc ? " on" : ""}`} aria-pressed={!!loc} onClick={askLoc}>{loc ? "Lokasiku aktif" : "Pakai lokasiku"}</button>
          <span className="pg-sample">DATA CONTOH</span>
        </div>
        {locMsg && <p className="pg-soft" role="alert">{locMsg}</p>}

        <div className="pg-grid">
          <section className="pg-card pg-mapcard" aria-label={view === "peta" ? "Peta" : "Daftar laporan"}>
            {!reports && <p className="pg-muted pg-pad">Memuat laporan…</p>}
            {reports && list.length === 0 && <p className="pg-empty" role="status">Belum ada laporan untuk filter ini.</p>}
            {geoErr && <p className="pg-warn" role="alert">GeoJSON belum dipasang. Simpan sebagai public/data/sidoarjo-kecamatan.geojson.</p>}
            {tileErr && view === "peta" && <p className="pg-warn" role="alert">Peta dasar tidak bisa dimuat. Buka lewat alamat web (localhost/https), bukan file lokal. Batas kecamatan tetap ditampilkan.</p>}
            {view === "peta" ? (
              <>
                <ReportMap geo={geo} reports={list} selectedId={sel} onSelect={setSel} chronic={chronic}
                  showChronic={chronicOn} showBorders={borderOn} userLoc={loc} focus={near.slice(0, 3)} onTileError={() => setTileErr(true)} />
                <ul className="pg-legend">
                  {STATUS_ORDER.map((s) => <li key={s}><StatusShape status={s} size={18} />{STATUS[s].label} {counts[s]}</li>)}
                  <li><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="4 3" /></svg>Titik kronis {chronic.length}</li>
                </ul>
                <p className="pg-note">Batas wilayah: GADM 4.1, perkiraan. Peta dasar: © OpenStreetMap contributors.</p>
              </>
            ) : (
              <div className="pg-tablewrap">
                <table className="pg-table">
                  <caption className="pg-sr">Daftar laporan (DATA CONTOH)</caption>
                  <thead><tr>{th("category", "Kategori")}{th("kec", "Kecamatan")}{loc && th("d", "Jarak")}{th("status", "Status")}{th("support", "Dukungan")}{th("date", "Tanggal")}</tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} tabIndex={0} className={r.id === sel ? "on" : ""} onClick={() => setSel(r.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(r.id); } }}>
                        <td>{r.category}</td><td>{KEC[r.kec]}</td>{loc && <td>{fmtDist(r.d)}</td>}<td><Chip status={r.status} /></td><td>{r.support}</td><td>{fmtDate(r.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <DetailCard r={selected} tick={tick} bump={() => setTick((t) => t + 1)} loc={loc} near={near} onPick={setSel} />
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
