import { samplePhoto } from "../lib/samplePhoto";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar, PageHead, PageFooter } from "../components/Layout";
import StatusShape from "../components/StatusShape";
import CameraCapture from "../components/CameraCapture";
import PickMap from "../components/PickMap";
import Banner from "../components/Banner";
import { STATUS, CATEGORIES } from "../data/status";
import info from "../data/kecamatan-info.json";
import { listReports, getInteraction, doSupport } from "../lib/reportsRepo";
import { dist } from "../lib/chronic";
import { loadGeo, detectKecamatan } from "../lib/geo";
import { submitReport, flushPending, saveDraft, listDrafts, removeDraft, draftBlob, giveAiConsent } from "../lib/sync";
import { checkPhoto } from "../lib/ai";
import { blobToDataUrl } from "../lib/idb";
import useOnline from "../lib/useOnline";
import { go } from "../nav";
import "../pages.css";

const KEC = Object.fromEntries(info.map((k) => [k.id, k.name]));
const THUMB = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 80 80\"><rect width=\"80\" height=\"80\" fill=\"#E0F0F0\"/></svg>");
const fmtDist = (d) => (d < 1000 ? `${Math.max(10, Math.round(d / 10) * 10)} m` : `${(d / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`);
const toNew = () => document.getElementById("laporan-baru")?.scrollIntoView({ behavior: "smooth", block: "start" });
const Cam = () => (<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16324F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z" /></svg>);

export default function LaporPage() {
  const online = useOnline();
  const [geo, setGeo] = useState(null);
  const [geoErr, setGeoErr] = useState(false);
  /* langkah 0 */
  const [reports, setReports] = useState([]);
  const [loc, setLoc] = useState(null);
  const [locMsg, setLocMsg] = useState("");
  const [kf, setKf] = useState("");
  const [sup, setSup] = useState(null);
  const [, setTick] = useState(0);
  /* form */
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [photo, setPhoto] = useState(null);
  const [cam, setCam] = useState(false);
  const [qOk, setQOk] = useState(false);
  const [ai, setAi] = useState({ phase: "idle" });
  const [desc, setDesc] = useState("");
  const [pos, setPos] = useState(null);
  const [gpsMsg, setGpsMsg] = useState("");
  const [tileErr, setTileErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [drafts, setDrafts] = useState(listDrafts());
  const [draftAi, setDraftAi] = useState({});   // hasil AI per draf: { [id]: {phase, data} }
  const [swapped, setSwapped] = useState([]);
  const aiRun = useRef(0);   // penanda pemeriksaan terbaru, supaya hasil foto lama tidak menimpa foto baru

  useEffect(() => { listReports().then(setReports); loadGeo().then(setGeo).catch(() => setGeoErr(true)); }, []);
  useEffect(() => { if (online) flushPending().then((r) => r.length && setSwapped(r)); }, [online]);

  const near = useMemo(() => {
    let l = reports.filter((r) => !kf || r.kec === kf);
    l = loc ? l.map((r) => ({ ...r, d: dist(loc, r) })).sort((a, b) => a.d - b.d) : [...l].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return l.slice(0, 3);
  }, [reports, loc, kf]);

  const kec = pos && geo ? detectKecamatan(pos.lat, pos.lng, geo) : null;
  const outside = !!(pos && geo && !kec);
  const locOk = !!(pos && kec);
  const mismatch = ai.phase === "done" && ai.data.category_match === "tidak" && cat !== ai.data.suggested_category;
  const isInvalid = ai.phase === "done" && ai.data.is_valid === "tidak";
  const aiUncertain = ai.phase === "done" && (ai.data.is_valid === "tidak_yakin" || ai.data.category_match === "tidak_yakin");
  const aiSeen = !!photo && ai.phase === "done";   // AI sudah melihat foto ini
  const canGo = !!photo && (!online || aiSeen);     // online: wajib dicek AI dulu. Offline: cukup ada foto (disimpan sebagai draf)
  const qIssue = photo && !qOk && (photo.quality.blur || photo.quality.dark || photo.quality.bright);

  const askLoc = () => {
    if (!navigator.geolocation) return setLocMsg("Lokasi tidak tersedia. Pilih kecamatan di samping.");
    navigator.geolocation.getCurrentPosition((p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocMsg(""); },
      () => setLocMsg("Izin lokasi ditolak. Pilih kecamatan di samping."), { timeout: 10000 });
  };
  const useGps = () => {
    if (!navigator.geolocation) return setGpsMsg("Pilih lokasi dengan mengetuk peta.");
    navigator.geolocation.getCurrentPosition((p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsMsg(""); },
      () => setGpsMsg("Pilih lokasi dengan mengetuk peta."), { timeout: 10000, enableHighAccuracy: true });
  };
  const onPhoto = (p) => { aiRun.current++; setPhoto(p); setQOk(false); setAi({ phase: "idle" }); setCam(false); };
  const runAi = async () => {
    const id = ++aiRun.current;
    giveAiConsent(); setAi({ phase: "loading" });
    try { const data = await checkPhoto({ dataUrl: photo.dataUrl, category: cat }); if (id === aiRun.current) setAi({ phase: "done", data, forCat: cat }); }
    catch { if (id === aiRun.current) setAi({ phase: "fail" }); }
  };

  const payload = () => ({ category: cat, description: desc.replace(/[<>]/g, "").trim().slice(0, 300), photoBlob: photo?.blob || null, capturedAt: photo?.capturedAt,
    lat: pos.lat, lng: pos.lng, kec: kec.id, needsReview: mismatch || isInvalid || aiUncertain, aiCheck: ai.phase === "done" ? ai.data : null });
  const kirim = async (d = payload(), draftId) => {
    if (!draftId && online && !aiSeen) { setStep(0); return; }   // jaga-jaga: tanpa pemeriksaan AI tidak boleh terkirim
    setBusy(true); setFailed(false);
    try {
      const rec = await submitReport(d);
      if (draftId) { await removeDraft(draftId); setDrafts(listDrafts()); }
      setDone(rec); setTimeout(() => document.getElementById("sukses")?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch {
      if (!draftId && !navigator.onLine) { await saveDraft(d); setDrafts(listDrafts()); }
      setFailed(true);
    }
    setBusy(false);
  };
  // Tanpa sinyal: simpan sebagai draf (belum terkirim, belum ada kode tiket)
  const simpanDraf = async () => {
    setBusy(true); setFailed(false);
    try { await saveDraft(payload()); setDrafts(listDrafts()); setDone({ draft: true }); setTimeout(() => document.getElementById("sukses")?.scrollIntoView({ behavior: "smooth" }), 60); }
    catch { setFailed(true); }
    setBusy(false);
  };
  const draftState = (dr) => draftAi[dr.id] || (dr.aiCheck ? { phase: "done", data: dr.aiCheck } : { phase: "idle" });
  const checkDraft = async (dr) => {
    giveAiConsent(); setDraftAi((m) => ({ ...m, [dr.id]: { phase: "loading" } }));
    try {
      const blob = await draftBlob(dr.id);
      const data = await checkPhoto({ dataUrl: await blobToDataUrl(blob), category: dr.category });
      setDraftAi((m) => ({ ...m, [dr.id]: { phase: "done", data } }));
    } catch { setDraftAi((m) => ({ ...m, [dr.id]: { phase: "fail" } })); }
  };
  const sendDraft = async (dr) => {
    const st = draftState(dr); if (st.phase !== "done") return;
    const data = st.data;
    await kirim({ ...dr, photoBlob: await draftBlob(dr.id), aiCheck: data, needsReview: !!(dr.needsReview || data.is_valid !== "ya" || data.category_match !== "ya") }, dr.id);
  };
  const toDrafts = () => document.getElementById("draf-saya")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const copy = async () => { try { await navigator.clipboard.writeText(done.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* abaikan */ } };
  const reset = () => { setDone(null); setStep(0); setPhoto(null); setAi({ phase: "idle" }); setDesc(""); setPos(null); setCat(CATEGORIES[0]); setQOk(false); setTimeout(toNew, 60); };

  const supportCard = (r) => {
    const it = getInteraction(r.id);
    return (
      <article key={r.id} className="pg-card pg-rcard">
        <div className="pg-rtop"><img src={r.photo_url || samplePhoto(r.category, 80, 80)} alt="" /><div><b>{r.category}</b><p>Kec. {KEC[r.kec]}{r.d != null && ` · ${fmtDist(r.d)} dari kamu`}</p></div></div>
        <div className="pg-rmid"><span className="pg-chip"><StatusShape status={r.status} size={16} />{STATUS[r.status].label}</span><span>{r.support + (it.support ? 1 : 0)} dukungan</span></div>
        <button className="pg-primary" disabled={it.support} onClick={async () => { try { await doSupport(r.id); setSup(r); setTick((t) => t + 1); } catch (e) { window.alert(e.message); } }}>{it.support ? "Didukung" : "Dukung"}</button>
      </article>
    );
  };

  return (
    <div className="pg">
      <Navbar active="lapor" />
      <PageHead label="LAPOR" title="Buat laporan" />
      <main className="pg-wrap pg-main">
        {swapped.map((s) => <Banner key={s.to} kind="ok" title="Laporan terkirim">Kode resmi {s.to} menggantikan kode sementara {s.from}.</Banner>)}

        {drafts.length > 0 && (
          <section id="draf-saya" className="pg-card" aria-labelledby="dr">
            <small className="pg-eyebrow tealtxt" id="dr">DRAF SAYA · BELUM TERKIRIM</small>
            <h2 className="pg-h2">{drafts.length} draf menunggu</h2>
            <ul className="pg-drafts">
              {drafts.map((d) => {
                const st = draftState(d);
                return (
                  <li key={d.id}>
                    <span><b>{d.category}</b> · Kec. {KEC[d.kec] || "-"}</span>
                    <span>
                      {st.phase === "done" && <span className="pg-chip">{st.data.is_valid === "ya" ? "AI: foto sesuai" : st.data.is_valid === "tidak" ? "AI: foto tampak tidak valid" : "AI: belum pasti"}</span>}
                      {!online && <span className="pg-muted">Menunggu sinyal</span>}
                      {online && st.phase !== "done" && <button className="pg-pill" disabled={st.phase === "loading"} onClick={() => checkDraft(d)}>{st.phase === "loading" ? "Memeriksa…" : st.phase === "fail" ? "Coba periksa lagi" : "Periksa foto (AI)"}</button>}
                      {online && st.phase === "done" && <button className="pg-primary pg-auto" disabled={busy} onClick={() => sendDraft(d)}>Kirim laporan</button>}
                      <button className="pg-pill" onClick={async () => { await removeDraft(d.id); setDrafts(listDrafts()); }}>Hapus</button>
                    </span>
                    {st.phase === "done" && <p className="pg-note" style={{ flexBasis: "100%" }}>Saran AI, bukan keputusan. {st.data.note}</p>}
                  </li>
                );
              })}
            </ul>
            <p className="pg-note">Data browser bisa terhapus (terutama di iOS). Jangan menumpuk draf terlalu lama.</p>
          </section>
        )}

        <section aria-labelledby="l0">
          <small className="pg-eyebrow tealtxt">LANGKAH 0 · SEBELUM FOTO</small>
          <h2 id="l0" className="pg-h2">Sudah ada yang melapor? Dukung saja.</h2>
          <div className="pg-bar">
            <button className={`pg-pill${loc ? " on" : ""}`} aria-pressed={!!loc} onClick={askLoc}>{loc ? "Lokasiku aktif" : "Pakai lokasiku"}</button>
            <span className="pg-muted">atau pilih kecamatan:</span>
            <label className="pg-select"><span className="pg-sr">Kecamatan</span>
              <select value={kf} onChange={(e) => setKf(e.target.value)}><option value="">Semua kecamatan</option>{info.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
            </label>
          </div>
          {locMsg && <p className="pg-soft" role="alert">{locMsg}</p>}
          <div className="pg-rgrid">
            {reports.length === 0 && <p className="pg-muted">Memuat laporan…</p>}
            {reports.length > 0 && near.length === 0 && <p className="pg-empty">Belum ada laporan di kecamatan ini.</p>}
            {near.map(supportCard)}
          </div>
          {sup && <Banner kind="ok" title="Dukungan tercatat" actions={<><button className="pg-pill" onClick={() => go("/peta")}>Lihat di peta</button><button className="pg-pill" onClick={toNew}>Buat laporan baru</button></>}>Laporan itu kini punya {sup.support + 1} dukungan.</Banner>}
          <div className="pg-rfoot">
            <button className="pg-link" onClick={() => go("/peta")}>Lihat semua di peta</button>
            <button className="pg-outline pg-wide" onClick={toNew}>Bukan salah satu ini, buat laporan baru ↓</button>
          </div>
        </section>

        {!done && (
          <section id="laporan-baru" aria-labelledby="lb">
            <small className="pg-eyebrow tealtxt" id="lb">LAPORAN BARU</small>
            {!online && <Banner kind="warn" title="Tanpa sinyal">Laporanmu akan disimpan sebagai draf di perangkat. Saat sinyal kembali, buka Draf saya, periksa foto dengan AI, lalu kirim.</Banner>}
            <ol className="pg-stepper" aria-label="Langkah laporan">
              {["Foto", "Lokasi", "Kirim"].map((t, i) => (
                <li key={t} className={step === i ? "cur" : ""}>
                  <button disabled={i > 0 && !canGo} onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}><span className="pg-sn">{i + 1}</span>{t}</button>
                  {i < 2 && <i className="pg-dash" />}
                </li>
              ))}
            </ol>

            <div className="pg-panels">
              {/* 1 FOTO */}
              <section className={`pg-card pg-panel${step === 0 ? " cur" : ""}`}>
                <h3>Foto masalahnya</h3>
                <div className="pg-vf">
                  <i className="pg-c tl" /><i className="pg-c tr" /><i className="pg-c bl" /><i className="pg-c br" />
                  {photo ? <img src={photo.dataUrl} alt="Foto laporan" /> : <Cam />}
                  <button className="pg-primary" onClick={() => setCam(true)}>{photo ? "Ulangi foto" : "Buka kamera"}</button>
                </div>
                <p className="pg-muted">Ambil dari jarak 2 sampai 3 meter.</p>
                {qIssue && (
                  <div className="pg-aicard warn" role="alert">
                    <p>{photo.quality.blur ? "Foto agak buram. Ulangi?" : photo.quality.dark ? "Foto agak gelap. Ulangi?" : "Foto terlalu terang. Ulangi?"}</p>
                    <div className="pg-bact"><button className="pg-pill" onClick={() => setCam(true)}>Ulangi foto</button><button className="pg-pill" onClick={() => setQOk(true)}>Pakai foto ini</button></div>
                  </div>
                )}
                <div className="pg-chips2" role="radiogroup" aria-label="Kategori">
                  {CATEGORIES.map((c) => <button key={c} role="radio" aria-checked={cat === c} className={`pg-pill${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
                </div>
                {photo && !qIssue && (
                  <div className={`pg-aicard${ai.phase === "done" ? (ai.data.is_valid === "tidak" ? " err" : (ai.data.category_match === "tidak" ? " warn" : (ai.data.is_valid === "ya" && ai.data.category_match === "ya" ? " ok" : ""))) : ""}`}>
                    <small className="pg-eyebrow">Pemeriksaan Keabsahan Foto (AI)</small>
                    {ai.phase === "idle" && (online
                      ? <><p>Saran AI, bukan keputusan</p><button className="pg-pill" onClick={runAi}>Periksa Foto</button></>
                      : <p>Tanpa sinyal: foto belum bisa diperiksa AI. Laporan akan disimpan sebagai draf, lalu diperiksa AI dan dikirim saat sinyal kembali.</p>)}
                    {ai.phase === "loading" && <p role="status">Memeriksa keabsahan foto…</p>}
                    {ai.phase === "fail" && <><p>Pemeriksaan AI belum berhasil. Laporan baru bisa dilanjutkan setelah foto diperiksa.</p><button className="pg-pill" onClick={runAi}>Coba lagi</button></>}
                    {ai.phase === "done" && ai.data.is_valid === "tidak" && (
                      <div className="pg-ai-body">
                        <div className="pg-ai-title">✕ Foto Terdeteksi Tidak Valid</div>
                        {ai.data.seen && <p className="pg-note">AI melihat: {ai.data.seen}</p>}
                        <p>{ai.data.note || "Foto tidak memperlihatkan masalah fisik fasilitas umum atau ruang publik yang sah."}</p>
                        <p className="pg-note">Laporan dengan foto yang tidak valid berisiko ditolak oleh petugas verifikator.</p>
                        <div className="pg-bact"><button className="pg-pill" onClick={() => setCam(true)}>Ambil foto ulang</button></div>
                      </div>
                    )}
                    {ai.phase === "done" && ai.data.is_valid === "ya" && ai.data.category_match === "ya" && (
                      <div className="pg-ai-body">
                        <div className="pg-ai-title">✓ Foto Terverifikasi Benar</div>
                        {ai.data.seen && <p className="pg-note">AI melihat: {ai.data.seen}</p>}
                        <p>{ai.data.note || `Foto valid memperlihatkan masalah fisik fasilitas umum sesuai kategori ${ai.forCat}.`}</p>
                      </div>
                    )}
                    {ai.phase === "done" && ai.data.is_valid === "ya" && ai.data.category_match === "tidak" && (
                      <div className="pg-ai-body">
                        <div className="pg-ai-title">⚠️ Foto Valid, Kategori Berbeda</div>
                        <p>Foto terverifikasi sebagai masalah fasilitas publik, namun terdeteksi lebih cocok dengan kategori <b>{ai.data.suggested_category}</b>.{ai.data.note ? ` (${ai.data.note})` : ""}</p>
                        <div className="pg-bact"><button className="pg-pill" onClick={() => setCat(ai.data.suggested_category)}>Ubah ke {ai.data.suggested_category}</button><button className="pg-pill" onClick={() => {}}>Tetap pilihanku</button></div>
                      </div>
                    )}
                    {ai.phase === "done" && (ai.data.is_valid === "tidak_yakin" || ai.data.category_match === "tidak_yakin") && (
                      <div className="pg-ai-body">
                        <div className="pg-ai-title">{ai.data.is_valid === "tidak_yakin" ? "Foto Belum Dapat Dipastikan" : "Kategori Belum Dapat Dipastikan"}</div>
                        <p>{ai.data.note || "AI belum dapat memastikan masalah pada foto atau kecocokannya dengan kategori. Pastikan foto fokus pada masalah."}</p>
                        <p className="pg-note">Laporan akan ditandai agar moderator dapat memeriksanya.</p>
                        <div className="pg-bact"><button className="pg-pill" onClick={() => setCam(true)}>Ambil foto ulang</button></div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* 2 LOKASI */}
              <section className={`pg-card pg-panel${step === 1 ? " cur" : ""}`}>
                <h3>Tandai lokasi</h3>
                <PickMap active={step === 1} geo={geo} pos={pos} onPick={(lat, lng) => { setPos({ lat, lng }); setGpsMsg(""); }} onTileError={() => setTileErr(true)} />
                {geoErr && <p className="pg-warn" role="alert">GeoJSON belum dipasang. Simpan sebagai public/data/sidoarjo-kecamatan.geojson.</p>}
                {outside && <Banner kind="warn" title="Lokasi di luar Sidoarjo">Lokasi ini di luar Kabupaten Sidoarjo. Geser pin ke dalam batas wilayah.</Banner>}
                <p className="pg-muted">{!pos ? "Ketuk peta untuk menaruh pin, atau pakai lokasi saya." : kec ? `Kecamatan terdeteksi: ${kec.name}. Geser pin bila perlu.` : ""}</p>
                {gpsMsg && <p className="pg-soft" role="alert">{gpsMsg}</p>}
                <button className="pg-outline" onClick={useGps}>Pakai lokasi saya</button>
                {pos
                  ? <a className="pg-link" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pos.lat},${pos.lng}`}>Cek di Street View</a>
                  : <span className="pg-link dim">Cek di Street View</span>}
                <p className="pg-note">Pratinjau saja; cakupan Street View tidak ada di semua jalan.</p>
                {(!online || tileErr) && <p className="pg-note">Gambar peta jalan tidak tersedia. Batas kecamatan dan pin tetap berfungsi.</p>}
              </section>

              {/* 3 KIRIM */}
              <section className={`pg-card pg-panel${step === 2 ? " cur" : ""}`}>
                <h3>Periksa lalu kirim</h3>
                <div className="pg-sum"><img src={photo?.dataUrl || THUMB} alt={photo ? "Foto laporan" : ""} /><p><b>{cat}</b><br />Kec. {kec ? kec.name : "[belum ditandai]"}</p></div>
                {!photo && <p className="pg-soft">Belum ada foto. Laporan tanpa foto lebih sulit diverifikasi.</p>}
                <label className="pg-muted" htmlFor="ket">Keterangan (boleh dikosongkan)</label>
                <textarea id="ket" className="pg-input" maxLength={300} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
                {isInvalid && <Banner kind="warn" title="Peringatan Keabsahan Foto">AI mendeteksi foto ini mungkin tidak valid sebagai masalah fisik fasilitas umum. Laporan berisiko ditolak oleh petugas verifikator.</Banner>}
                {mismatch && <p className="pg-soft">AI mendeteksi foto ini lebih cocok dengan kategori {ai.data.suggested_category}. Kamu tetap bisa mengirim.</p>}
                <button className="pg-primary" disabled={busy || !locOk || !photo || (online && !aiSeen)} onClick={() => (online ? kirim() : simpanDraf())}>
                  {online ? (busy ? "Mengirim…" : "Kirim laporan") : (busy ? "Menyimpan…" : "Simpan sebagai draf")}
                </button>
                {online && !aiSeen && <p className="pg-soft">Foto belum diperiksa AI. Kembali ke langkah 1.</p>}
                {(!online || aiSeen) && !locOk && <p className="pg-soft">Tandai lokasi dulu di langkah 2.</p>}
                <p className="pg-muted">{online ? "Kamu mendapat kode tiket setelah dikirim." : "Tanpa sinyal: laporan tersimpan sebagai draf dan belum terkirim. Kode tiket didapat setelah draf dikirim."}</p>
                {failed && <Banner kind="err" title="Belum terkirim" actions={<><button className="pg-pill" onClick={() => kirim()}>Coba kirim lagi</button>{!navigator.onLine && <button className="pg-pill" onClick={toDrafts}>Lihat draf saya</button>}</>}>{navigator.onLine ? "Gagal mengirim ke Supabase. Data belum tersimpan; silakan coba lagi." : "Laporan disimpan sementara di perangkat dan akan dikirim saat koneksi kembali."}</Banner>}
                {drafts.length > 0 && !failed && <button className="pg-link" onClick={toDrafts}>Draf saya ({drafts.length})</button>}
              </section>
            </div>

            <div className="pg-mnav">
              <button className="pg-outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Kembali</button>
              <span aria-live="polite">{step + 1} dari 3 <i className="pg-dots">{[0, 1, 2].map((i) => <u key={i} className={i === step ? "on" : ""} />)}</i></span>
              <button className="pg-primary" disabled={step === 2 || (step === 0 && !canGo) || (step === 1 && !locOk)} onClick={() => setStep(step + 1)}>Lanjut</button>
            </div>
            {step === 0 && !canGo && <p className="pg-soft" role="status">{!photo ? "Ambil foto dulu untuk melanjutkan." : "Periksa foto dengan AI dulu untuk melanjutkan."}</p>}
          </section>
        )}
      </main>

      {done && (
        <section id="sukses" className="pg-success" aria-live="polite">
          <div className="pg-wrap">
            <small className="pg-eyebrow tealtxt">SETELAH DIKIRIM</small>
            {!done.draft && <div className="pg-ticket"><i className="pg-notch l" /><i className="pg-notch r" /><small>{done.temp ? "KODE SEMENTARA" : "KODE TIKET"}</small><b>{done.code}</b></div>}
            <h2 className="pg-h2">{done.draft ? "Tersimpan sebagai draf" : done.temp ? "Laporan tersimpan" : "Laporan terkirim"}</h2>
            {done.draft && <p className="pg-muted">Laporanmu belum terkirim. Saat sinyal kembali, buka Draf saya, periksa foto dengan AI, lalu kirim.</p>}
            {done.temp && <p className="pg-muted">Tidak ada sinyal. Laporanmu tersimpan di ponsel dan terkirim otomatis saat sinyal kembali. Kode resmi menyusul.</p>}
            <div className="pg-acts">
              {!done.draft && <button className="pg-primary pg-auto" onClick={copy}>{copied ? "Tersalin ✓" : "Salin kode"}</button>}
              {!done.draft && <button className="pg-outline pg-auto" onClick={() => go(`/lacak/${done.code}`)}>Lacak laporan</button>}
              <button className="pg-outline pg-auto" onClick={reset}>Lapor lagi</button>
            </div>
            {!done.draft && <p className="pg-muted">Kode juga tersimpan di perangkatmu.</p>}
          </div>
        </section>
      )}
      <PageFooter />
      {cam && <CameraCapture onCapture={onPhoto} onClose={() => setCam(false)} />}
    </div>
  );
}
