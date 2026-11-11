import { samplePhoto } from "../lib/samplePhoto";
import { useEffect, useState } from "react";
import { Navbar, PageHead, PageFooter } from "../components/Layout";
import StatusShape from "../components/StatusShape";
import CameraCapture from "../components/CameraCapture";
import Banner from "../components/Banner";
import { statusMeta } from "../data/status";
import info from "../data/kecamatan-info.json";
import { getReport, patchReport, listMine, normCode, flushPending } from "../lib/sync";
import { getPhoto, putPhoto, blobToDataUrl } from "../lib/idb";
import { comparePhotos, draftLetter } from "../lib/ai";
import { STALL_DAYS, CONFIRM_DAYS } from "../config";
import useOnline from "../lib/useOnline";
import { downloadPhoto, enabled, photoUrl, uploadPhoto } from "../lib/supabase";
import { go } from "../nav";
import "../pages.css";

const KEC = Object.fromEntries(info.map((k) => [k.id, k.name]));
const SEQ = ["diterima", "diverifikasi", "dikerjakan", "selesai_dinas"];
const fmt = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const days = (d) => (Date.now() - +new Date(d)) / 864e5;
const THUMB = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 110\"><rect width=\"160\" height=\"110\" fill=\"#E0F0F0\"/><text x=\"80\" y=\"58\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"11\" fill=\"#087878\">Foto contoh</text></svg>");
const LADDER = [
  { n: "RT/RW dan kepala desa atau lurah", t: "RT/RW dan kepala desa atau lurah", d: "Orang terdekat yang mengenal lingkunganmu. Cocok dihubungi pertama, sebelum naik ke dinas." },
  { n: "Dinas terkait di kabupaten", t: "Dinas terkait di Kabupaten Sidoarjo", d: "Dinas yang menangani jalan, penerangan, kebersihan, atau pengairan. Cocok bila tingkat desa atau kelurahan belum menanggapi." },
  { n: "Ombudsman", t: "Ombudsman", d: "Lembaga pengawas pelayanan publik. Cocok bila dinas tidak menanggapi dalam waktu wajar." },
  { n: "DPRD", t: "Pimpinan dan anggota DPRD Kabupaten Sidoarjo", d: "Wakil rakyat di kabupaten. Cocok sebagai jalur terakhir, terutama untuk masalah yang berulang." },
];
const AILabel = () => <small className="pg-eyebrow">Verifikasi AI</small>;

function ConfirmBox({ rec, online, onDone }) {
  const [cam, setCam] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [ai, setAi] = useState({ phase: "idle" });
  const [saveError, setSaveError] = useState("");
  const compare = async () => {
    setAi({ phase: "loading" });
    try {
      const b = rec.hasPhoto && !rec.is_demo
        ? (rec.photo_path ? await downloadPhoto(rec.photo_path) : await getPhoto(rec.id))
        : null;
      if (!b) { setAi({ phase: "nobefore" }); return; }   // tanpa foto laporan awal, tidak ada yang bisa dibandingkan
      setAi({ phase: "done", data: await comparePhotos({ before: await blobToDataUrl(b), after: photo.dataUrl }) });
    } catch { setAi({ phase: "fail" }); }
  };
  const choose = async (result) => {
    setSaveError("");
    try {
      const key = `${rec.code}-konfirmasi`;
      let photoPath = null;
      if (navigator.onLine && enabled) {
        const ext = photo.blob.type === "image/png" ? "png" : photo.blob.type === "image/webp" ? "webp" : "jpg";
        photoPath = `confirmations/${crypto.randomUUID()}.${ext}`;
        await uploadPhoto(photoPath, photo.blob);
      } else {
        await putPhoto(key, photo.blob);
      }
      const d = ai.phase === "done" ? ai.data : null;
      const differs = d && ((result === "selesai" && (d.issue_still_visible === "ya" || d.same_location === "tidak")) || (result === "belum" && d.issue_still_visible === "tidak"));
      const status = result === "selesai" ? "terkonfirmasi" : "disengketakan", at = new Date().toISOString();
      await patchReport(rec.code, {
        status,
        history: [...rec.history, { status, at }],
        needs_review: !!rec.needs_review || !!differs,
        confirmation: { result, ai_compare: d, at, photoKey: photoPath ? null : key, photo_path: photoPath, pendingCompare: !d }
      });
      onDone();
    } catch (error) {
      setSaveError(error.message || "Konfirmasi gagal disimpan.");
    }
  };
  const s = ai.data;
  return (
    <section className="pg-card pg-conf" aria-labelledby="cf">
      <small className="pg-eyebrow" id="cf">KONFIRMASI SELESAI</small>
      <p>Petugas menyatakan laporan ini selesai. Potret lokasi langsung dengan kamera, lalu pilih jawabanmu.</p>
      <div className="pg-conf-photo">
        {photo ? <img src={photo.dataUrl} alt="Foto konfirmasi" /> : <span className="pg-muted">Belum ada foto konfirmasi.</span>}
        <button className="pg-outline pg-auto" onClick={() => setCam(true)}>{photo ? "Ulangi foto" : "Buka kamera"}</button>
      </div>
      {photo && ai.phase === "idle" && (online
        ? <div className="pg-aicard"><p>Foto dikirim ke layanan AI untuk dibandingkan dengan foto laporan awal.</p><button className="pg-pill" onClick={compare}>Bandingkan dengan AI</button></div>
        : <p className="pg-soft">Tanpa sinyal: perbandingan AI berjalan saat sinyal ada. Kamu tetap bisa menjawab.</p>)}
      {ai.phase === "loading" && <p role="status">Membandingkan…</p>}
      {ai.phase === "fail" && <p className="pg-soft">Pemeriksaan otomatis belum tersedia. Kamu tetap bisa menjawab; perbandingan dicoba lagi saat layanan tersedia.</p>}
      {saveError && <p className="pg-warn" role="alert">{saveError}</p>}
      {ai.phase === "nobefore" && <p className="pg-soft">Laporan ini tidak punya foto awal di perangkat ini, jadi AI tidak bisa membandingkan. Kamu tetap bisa menjawab.</p>}
      {s && (
        <div className="pg-aicard"><AILabel />
          <p>{s.same_location === "ya" ? "Lokasi terverifikasi sama." : s.same_location === "tidak" ? "Lokasi tidak sesuai dengan foto awal." : "Kesesuaian lokasi: belum dapat dipastikan."} {s.issue_still_visible === "ya" ? "Masalah terdeteksi masih tampak." : s.issue_still_visible === "tidak" ? "Masalah terkonfirmasi sudah tertangani." : "Status penanganan: belum dapat dipastikan."}</p>
        </div>
      )}
      <div className="pg-acts">
        <button className="pg-primary pg-auto" disabled={!photo} onClick={() => choose("selesai")}>Ya, sudah selesai</button>
        <button className="pg-outline pg-auto" disabled={!photo} onClick={() => choose("belum")}>Belum selesai</button>
      </div>
      {!photo && <p className="pg-note">Kedua jawaban wajib menyertakan foto dari kamera. Foto dari kamera mempersulit pemalsuan, tetapi tidak membuktikan keaslian.</p>}
      {cam && <CameraCapture onCapture={(p) => { setPhoto(p); setAi({ phase: "idle" }); setCam(false); }} onClose={() => setCam(false)} />}
    </section>
  );
}

function Escalate({ rec }) {
  const [sel, setSel] = useState(0);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const make = async () => {
    setBusy(true);
    const r = await draftLetter({ category: rec.category, kecName: KEC[rec.kec], created: rec.created_at, support: rec.support, target: LADDER[sel].t,
      history: rec.history.map((h) => ({ label: statusMeta(h.status).label, at: h.at })) });   // tanpa identitas pelapor
    setOut(r); setBusy(false);
  };
  return (
    <section className="pg-card" aria-labelledby="mk">
      <small className="pg-eyebrow" id="mk">LAPORAN MANDEK?</small>
      <p>Status belum berubah lebih dari {STALL_DAYS} hari. Kamu bisa naik ke pihak berikutnya.</p>
      <ol className="pg-ladder" role="radiogroup" aria-label="Tujuan surat">
        {LADDER.map((l, i) => (
          <li key={l.n}><button role="radio" aria-checked={sel === i} className={sel === i ? "on" : ""} onClick={() => { setSel(i); setOut(null); }}><span className="pg-sn">{i + 1}</span><span><b>{l.n}</b><br />{l.d}</span></button></li>
        ))}
      </ol>
      <button className="pg-primary pg-auto" disabled={busy} onClick={make}>{busy ? "Menyusun…" : "Buat draf surat"}</button>
      {out && (
        <div className="pg-letter">
          <small className="pg-eyebrow">{out.template ? "Templat surat resmi (cadangan): Periksa sebelum dikirim" : "Draf surat dibuat oleh AI: Periksa sebelum dikirim"}</small>
          <textarea className="pg-input" rows={12} value={out.letter} onChange={(e) => setOut({ ...out, letter: e.target.value })} aria-label="Draf surat (bisa diedit)" />
          <button className="pg-outline pg-auto" onClick={async () => { try { await navigator.clipboard.writeText(out.letter); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* abaikan */ } }}>{copied ? "Tersalin ✓" : "Salin draf"}</button>
          <p className="pg-note">Ranawarta tidak mengirim surat otomatis. Kirim sendiri lewat kanal yang sesuai.</p>
        </div>
      )}
    </section>
  );
}

export default function LacakPage({ code = "" }) {
  const online = useOnline();
  const [input, setInput] = useState(code);
  const [n, setN] = useState(0);
  const [img, setImg] = useState(null);
  const [rec, setRec] = useState(null);
  const [recordError, setRecordError] = useState("");
  const refresh = () => setN((x) => x + 1);

  useEffect(() => {
    if (online) flushPending().then((r) => r.length && refresh()).catch((e) => setRecordError(e.message));
  }, [online]);
  useEffect(() => {
    let active = true;
    setRec(null);
    setRecordError("");
    if (code) getReport(code).then((row) => { if (active) setRec(row); }).catch((e) => { if (active) setRecordError(e.message); });
    return () => { active = false; };
  }, [code, n]);
  useEffect(() => {          // perbandingan AI yang tertunda (foto konfirmasi diambil offline)
    const c = rec?.confirmation;
    if (!online || !c?.pendingCompare) return;
    (async () => {
      const [b, b0] = await Promise.all([
        c.photo_path ? downloadPhoto(c.photo_path) : getPhoto(c.photoKey),
        rec.hasPhoto && !rec.is_demo ? (rec.photo_path ? downloadPhoto(rec.photo_path) : getPhoto(rec.id)) : null
      ]);
      if (!b || !b0) return;
      let d; try { d = await comparePhotos({ before: await blobToDataUrl(b0), after: await blobToDataUrl(b) }); } catch { return; /* belum tersedia: coba lagi nanti */ }
      const differs = (c.result === "selesai" && (d.issue_still_visible === "ya" || d.same_location === "tidak")) || (c.result === "belum" && d.issue_still_visible === "tidak");
      await patchReport(rec.code, { needs_review: !!rec.needs_review || differs, confirmation: { ...c, ai_compare: d, pendingCompare: false } }); refresh();
    })();
  }, [online, rec?.code, rec?.confirmation?.pendingCompare]);
  useEffect(() => {
    let u; setImg(null);
    if (rec?.photo_path) setImg(photoUrl(rec.photo_path));
    else if (rec?.hasPhoto && !rec.is_demo) getPhoto(rec.id).then((b) => { if (b) { u = URL.createObjectURL(b); setImg(u); } });
    return () => u && URL.revokeObjectURL(u);
  }, [rec?.id]);

  const submit = (e) => { e.preventDefault(); const c = normCode(input); if (c) go(`/lacak/${c}`); };
  const last = rec ? rec.history[rec.history.length - 1]?.at : null;
  const shown = rec && rec.status === "selesai_dinas" && days(last) > CONFIRM_DAYS ? "selesai_belum_dikonfirmasi" : rec?.status;
  const mandek = rec && !rec.temp && rec.status !== "terkonfirmasi" && rec.status !== "menunggu" && days(last) > STALL_DAYS;
  const has = (s) => rec?.history.find((h) => h.status === s);
  const final = rec && (rec.status === "terkonfirmasi" || rec.status === "disengketakan") ? rec.status : null;
  const mine = listMine();
  const next = rec && SEQ.indexOf(rec.status) >= 0 && rec.status !== "selesai_dinas" ? SEQ[SEQ.indexOf(rec.status) + 1] : null;

  return (
    <div className="pg" data-n={n}>
      <Navbar active="lacak" />
      <PageHead label="LACAK" title="Pantau laporanmu" />
      <main className="pg-wrap pg-main pg-lk">
        <form className="pg-card pg-find" onSubmit={submit}>
          <label htmlFor="kode"><small className="pg-eyebrow tealtxt">KODE TIKET</small></label>
          <div className="pg-findrow">
            <input id="kode" className="pg-input pg-code-in" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="RW-XXXX" autoComplete="off" />
            <button className="pg-primary pg-auto" type="submit">Cek status</button>
          </div>
          <p className="pg-note">Kode contoh untuk mencoba: RW-0421 dan RW-0422 (DATA CONTOH).</p>
          <details className="pg-mine"><summary>Laporan saya</summary>
            {mine.length === 0 ? <p className="pg-muted">Belum ada laporan di perangkat ini.</p> : (
              <ul>{mine.map((r) => <li key={r.id}><button className="pg-link" onClick={() => go(`/lacak/${r.code}`)}>{r.code}</button> · {r.category} · {fmt(r.created_at)}{r.temp ? " · Menunggu terkirim" : ""}</li>)}</ul>
            )}
          </details>
        </form>

        {recordError && <p className="pg-warn" role="alert">{recordError}</p>}
        {code && !rec && <Banner kind="warn" title="Kode tidak ditemukan">Periksa lagi penulisan kode {code}. Kode hanya bisa dicek oleh pemiliknya di perangkat yang sama atau lewat kode contoh.</Banner>}

        {rec && (
          <>
            <article className="pg-card pg-report">
              <img src={img || samplePhoto(rec.category, 160, 110)} alt={img ? "Foto laporan" : "Foto contoh"} />
              <div>
                <h2 className="pg-h2">{rec.category}</h2>
                <p className="pg-muted">Kec. {KEC[rec.kec] || "-"} · {fmt(rec.created_at)}{rec.is_demo && " · DATA CONTOH"}</p>
                <span className="pg-chip"><StatusShape status={shown} size={16} />{statusMeta(shown).long}</span>
                {rec.needs_review && <p className="pg-note">Laporan ini ditandai untuk ditinjau moderator.</p>}
              </div>
            </article>

            {rec.temp ? (
              <Banner kind="warn" title="Menunggu terkirim">Kode sementara {rec.code}. Laporan terkirim otomatis saat sinyal kembali, lalu kode resmi menggantikannya.</Banner>
            ) : (
              <section className="pg-card" aria-label="Riwayat status">
                <ol className="pg-tl">
                  {SEQ.map((s) => { const h = has(s); return (
                    <li key={s} className={h ? "done" : ""}><StatusShape status={s} size={22} /><div><b>{statusMeta(s).long}</b><span>{h ? fmt(h.at) : "Belum"}</span></div></li>
                  ); })}
                  <li className={final ? "done" : ""}>
                    <StatusShape status={final || "terkonfirmasi"} size={22} />
                    <div><b>{final ? statusMeta(final).long : "Menunggu konfirmasi warga"}</b><span>{final ? fmt(has(final)?.at) : "Belum"}</span></div>
                  </li>
                </ol>
              </section>
            )}

            {rec.status === "selesai_dinas" && <ConfirmBox rec={rec} online={online} onDone={refresh} />}
            {mandek && <Escalate rec={rec} />}

            {next && (
              <details className="pg-acc"><summary>Alat uji prototipe (bukan fitur)</summary>
                <p className="pg-note">Panel admin di luar cakupan. Tombol ini hanya meniru petugas agar alur bisa dicoba.</p>
                <button className="pg-outline pg-auto" onClick={() => { patchReport(rec.code, { status: next, history: [...rec.history, { status: next, at: new Date().toISOString() }] }); refresh(); }}>Majukan status ke: {statusMeta(next).long}</button>
              </details>
            )}
          </>
        )}
      </main>
      <PageFooter />
    </div>
  );
}
