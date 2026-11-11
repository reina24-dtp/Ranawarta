import { useEffect, useMemo, useState } from "react";
import { Navbar, PageHead, PageFooter } from "../components/Layout";
import SidoarjoMap from "../components/SidoarjoMap";
import info from "../data/kecamatan-info.json";
import { SOURCES, SOURCES_INTRO } from "../data/sources";
import { listReports } from "../lib/reportsRepo";
import { REAL_REPORTS_THRESHOLD, NEED_THRESHOLD, LOW_REPORTS } from "../config";
import "../pages.css";

const nf = (n) => n.toLocaleString("id-ID");
const ranked = info.filter((k) => k.lengang_rank).sort((a, b) => a.lengang_rank - b.lengang_rank);
const ref = info.find((k) => k.id === "taman");
const maxD = Math.max(...info.map((k) => k.density_2022 || 0));
const known = info.filter((k) => k.density_2022 != null).length;
const ratio = ref.density_2022 && ranked[0]?.density_2022 ? ref.density_2022 / ranked[0].density_2022 : null;
const ratioText = ratio && ratio >= 9 && ratio < 10 ? "hampir sepuluh kali" : ratio ? `sekitar ${Math.round(ratio)} kali` : null;

const Lock = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);

export default function LengangPage() {
  const [tab, setTab] = useState("kepadatan");
  const [reports, setReports] = useState([]);
  const [sim, setSim] = useState(false);
  const [all, setAll] = useState(false);
  const [src, setSrc] = useState(false);

  useEffect(() => { listReports().then(setReports); }, []);
  const real = reports.filter((r) => !r.is_demo).length;
  const locked = real < REAL_REPORTS_THRESHOLD;

  const table = useMemo(() => [...info].sort((a, b) => b.need_index - a.need_index), []);
  const flagged = useMemo(() => {
    const cnt = {}; reports.forEach((r) => { cnt[r.kec] = (cnt[r.kec] || 0) + 1; });
    return info.filter((k) => k.need_index >= NEED_THRESHOLD && (cnt[k.id] || 0) <= LOW_REPORTS).map((k) => ({ ...k, n: cnt[k.id] || 0 }));
  }, [reports]);

  const pickTab = (t) => { setTab(t); if (t === "kebutuhan") document.getElementById("kebutuhan")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="pg">
      <Navbar active="sunyi" />
      <PageHead label="KECAMATAN PALING LENGANG" title="Kepadatan penduduk terendah di Sidoarjo" />
      <main className="pg-wrap pg-main">
        <div className="pg-tabs" role="tablist" aria-label="Lapisan data">
          <button role="tab" aria-selected={tab === "kepadatan"} className={tab === "kepadatan" ? "on" : ""} onClick={() => pickTab("kepadatan")}>Kepadatan</button>
          <button role="tab" aria-selected={tab === "kebutuhan"} className={tab === "kebutuhan" ? "on" : ""} onClick={() => pickTab("kebutuhan")}>Kebutuhan</button>
          <button role="tab" aria-disabled="true" disabled className="dim">Wilayah sunyi · belum aktif</button>
        </div>

        <div className="pg-two">
          <section className="pg-deep" aria-labelledby="kp">
            <h2 id="kp" className="pg-deep-title">Kepadatan penduduk (jiwa per km²)</h2>
            <div className="pg-deep-body">
              <ol className="pg-rank">
                {ranked.map((k) => (
                  <li key={k.id}>
                    <span className="pg-num">{k.lengang_rank}</span>
                    <div><b>{k.name}</b><i><u style={{ width: `${(k.density_2022 / maxD) * 100}%` }} /></i></div>
                    <em>{nf(k.density_2022)}</em>
                  </li>
                ))}
                <li>
                  <span className="pg-num dashed" aria-hidden="true" />
                  <div><b>{ref.name} (pembanding)</b><i><u style={{ width: "100%" }} /></i></div>
                  <em>{nf(ref.density_2022)}</em>
                </li>
              </ol>
              <figure className="pg-mapfig">
                <SidoarjoMap className="pg-svgmap" fill="#20B8A6" highlight={ranked.map((k) => k.id)} ring="taman" />
                <figcaption>Batas: GADM 4.1, perkiraan.</figcaption>
              </figure>
            </div>
            {ratioText && <p className="pg-deep-p"><b>Jabon {ratioText} lebih lengang daripada Taman.</b></p>}
            <p className="pg-deep-p small">Sumber: Open Data Kab. Sidoarjo (Dispendukcapil), kepadatan Juni 2022.{known < info.length && ` Data kepadatan belum lengkap (${known} dari ${info.length} kecamatan).`}</p>
          </section>

          <aside className="pg-card pg-l2" aria-labelledby="l2">
            <small className="pg-eyebrow" id="l2">LAPISAN 2 · WILAYAH SUNYI</small>
            <div className="pg-lockmap" aria-hidden="true">
              <SidoarjoMap className="pg-svgmap" fill="#D5DCE3" />
              <span className="pg-lock"><Lock /></span>
            </div>
            <h3>{locked ? "Belum cukup laporan nyata untuk menilai" : "Wilayah sunyi aktif"}</h3>
            <p className="pg-muted">Tanda sunyi aktif setelah laporan nyata terkumpul. Sunyi bukan berarti tidak ada masalah; bisa jadi warganya sulit melapor.</p>
            <div className="pg-prog-h"><span>Laporan nyata terkumpul</span><span>{nf(real)} dari {nf(REAL_REPORTS_THRESHOLD)}</span></div>
            <div className="pg-prog" role="progressbar" aria-valuemin="0" aria-valuemax={REAL_REPORTS_THRESHOLD} aria-valuenow={real}><u style={{ width: `${Math.min(100, (real / REAL_REPORTS_THRESHOLD) * 100)}%` }} /></div>
            <button className="pg-outline" onClick={() => setSim(true)}>Lihat simulasi (bukan temuan)</button>
          </aside>
        </div>

        {sim && (
          <section className="pg-card pg-sim" aria-label="Simulasi">
            <p className="pg-banner" role="note">SIMULASI, BUKAN TEMUAN</p>
            <p className="pg-muted">Memakai DATA CONTOH yang disebar tanpa diarahkan ke kecamatan tertentu. Tanda memakai ambang contoh (indeks ≥ {NEED_THRESHOLD}, laporan ≤ {LOW_REPORTS}) yang belum divalidasi.</p>
            <div className="pg-simgrid">
              <SidoarjoMap className="pg-svgmap" fill="#B8D8D8" highlight={flagged.map((k) => k.id)} />
              <ul className="pg-chips">
                {flagged.length === 0 && <li>Tidak ada kecamatan yang memenuhi ambang pada data contoh.</li>}
                {flagged.map((k, i) => <li key={k.id}><b>{i + 1}. {k.name}</b> · indeks {k.need_index} · {k.n} laporan contoh</li>)}
              </ul>
            </div>
            <button className="pg-outline" onClick={() => setSim(false)}>Tutup simulasi</button>
          </section>
        )}

        <section id="kebutuhan" className="pg-sec">
          <small className="pg-eyebrow tealtxt">LAPISAN 1 · KEBUTUHAN MENURUT DATA PUBLIK</small>
          <div className="pg-card pg-tablewrap">
            <table className="pg-table">
              <caption className="pg-sr">Kebutuhan menurut data publik, urut indeks awal tertinggi</caption>
              <thead><tr><th>Kecamatan</th><th>Penduduk (semester I 2025)</th><th>Skor banjir</th><th>Sumber banjir</th><th>Indeks awal</th></tr></thead>
              <tbody>
                {(all ? table : table.slice(0, 5)).map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td><td>{nf(k.population)}</td><td>{k.flood_score}</td>
                    <td>{k.flood_sources.length ? k.flood_sources.map((s) => <button key={s} className="pg-code" onClick={() => setSrc(true)} aria-label={`Buka daftar sumber ${s}`}>{s}</button>) : "–"}</td>
                    <td>{k.need_index}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pg-note">Indeks awal: rumus tim, belum divalidasi. Skor banjir = jumlah sumber yang menyebut kecamatan itu, bukan tingkat bahaya.</p>
          <div className="pg-actions">
            <button className="pg-link" onClick={() => setAll(!all)}>{all ? "Tampilkan 5 teratas" : "Tampilkan semua 18 kecamatan"}</button>
            <button className="pg-link" aria-expanded={src} onClick={() => setSrc(!src)}>Lihat sumber</button>
          </div>
          {src && (
            <div className="pg-card pg-sources">
              <p className="pg-note">{SOURCES_INTRO}</p>
              <ul>
                {SOURCES.map((s) => (
                  <li key={s.code}>
                    <b>{s.code}</b> {s.text}
                    <span className="pg-srcwhat">{s.what}</span>
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">Buka sumber ↗</a> : <em>Tautan menyusul</em>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="pg-method">
          <small className="pg-eyebrow">METODOLOGI DAN BATASAN</small>
          <p>Penduduk: Open Data Kab. Sidoarjo (Dispendukcapil). Kepadatan: Juni 2022. Batas wilayah: GADM 4.1, perkiraan. Indeks awal = 50% kepadatan + 50% skor banjir. Tanda "sunyi" hanya muncul dari laporan nyata, dan data contoh selalu berlabel SIMULASI.</p>
        </section>
        <details className="pg-acc">
          <summary>Cara menghitung dan batasan data</summary>
          <ul>
            <li>Penduduk: Open Data Kab. Sidoarjo (Dispendukcapil), semester I 2025.</li>
            <li>Kepadatan: Juni 2022 (jiwa per km²). Baru {known} dari {info.length} kecamatan yang sudah dicek; peringkat hanya untuk nilai yang ada.</li>
            <li>Indeks awal = 50% kepadatan (min-max) + 50% (skor banjir ÷ 5), dikali 100. Rumus tim, belum divalidasi.</li>
            <li>Skor banjir (0 sampai 5) = jumlah sumber independen yang menyebut kecamatan itu sebagai wilayah banjir atau genangan. Ini frekuensi disebut, bukan tingkat bahaya; 0 bukan berarti aman.</li>
            <li>Batas wilayah dan luas dari GADM 4.1 bersifat perkiraan; wilayah pesisir ikut menghitung perairan.</li>
            <li>Tanda sunyi aktif hanya setelah ≥ {nf(REAL_REPORTS_THRESHOLD)} laporan nyata terkumpul, untuk kecamatan berindeks ≥ {NEED_THRESHOLD} dengan laporan nyata ≤ {LOW_REPORTS}. Ambang ini belum divalidasi. Data ini tidak cukup untuk menyimpulkan suatu kecamatan kurang terlayani.</li>
          </ul>
        </details>
      </main>
      <PageFooter />
    </div>
  );
}
