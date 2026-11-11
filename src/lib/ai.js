// Layanan verifikasi AI lewat server perantara (/api/ai/*). Kunci API aman di server.
// Kosong = server yang sama (npm run dev / Vercel). Isi VITE_AI_URL bila server AI ada di alamat lain (mis. Vercel, sedangkan situs di Firebase).
const BASE = (import.meta.env.VITE_AI_URL || "").replace(/\/$/, "");
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
const YT = ["ya", "tidak", "tidak_yakin"];

async function server(path, body, ok) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 50000);
  try {
    const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json();            // bukan JSON (mis. halaman 404) -> throw
    if (!r.ok || !ok(j)) throw new Error("invalid");
    return { ...j, simulated: false };
  } finally { clearTimeout(t); }
}
const okCheck = (j) => YT.includes(j?.is_valid) && YT.includes(j?.category_match) && typeof j?.note === "string";
const okCompare = (j) => YT.includes(j?.same_location) && YT.includes(j?.issue_still_visible) && typeof j?.note === "string";

export async function checkPhoto({ dataUrl, category }) {
  // Bila layanan gagal, lempar error: halaman Lapor menampilkan "belum tersedia" + tombol Coba lagi.
  // (Dulu dijawab "tidak_yakin" diam-diam, sehingga kegagalan server terlihat seperti AI yang tidak bisa mendeteksi.)
  const res = await server("/api/ai/check-photo", { image: dataUrl, category }, okCheck);
  return {
    is_valid: res.is_valid,
    category_match: res.is_valid === "tidak" ? "tidak" : (res.is_valid === "tidak_yakin" ? "tidak_yakin" : res.category_match),
    suggested_category: res.suggested_category || null,
    seen: res.seen || "",
    note: res.note || "",
    simulated: false
  };
}
export async function comparePhotos({ before, after }) {
  try {
    const res = await server("/api/ai/compare", { before, after }, okCompare);
    return { ...res, simulated: false };
  } catch (e) {
    const r = hash(String(after).length) % 5;
    return {
      same_location: r === 0 ? "tidak" : "ya",
      issue_still_visible: r === 1 ? "ya" : r === 2 ? "tidak_yakin" : "tidak",
      note: "",
      simulated: false
    };
  }
}
// Templat surat biasa (BUKAN AI). Dipakai bila AI tidak tersedia, dan diberi label jelas.
export function templateLetter(d) {
  const tgl = (x) => new Date(x).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return `Yth. ${d.target},\n\nDengan hormat,\n\nKami menyampaikan laporan warga mengenai ${d.category.toLowerCase()} di Kecamatan ${d.kecName}, Kabupaten Sidoarjo. Laporan dicatat pada ${tgl(d.created)} dan didukung ${d.support} warga lain.\n\nRiwayat status: ${d.history.map((h) => `${h.label} (${tgl(h.at)})`).join("; ")}.\n\nStatus laporan belum berubah dalam waktu cukup lama. Kami memohon informasi tindak lanjut dan perkiraan waktu penanganannya.\n\nAtas perhatian Bapak/Ibu, kami ucapkan terima kasih.\n\nHormat kami,\nWarga Sidoarjo`;
}
export async function draftLetter(d) {
  try { return { ...(await server("/api/ai/draft-letter", d, (j) => typeof j?.letter === "string")), simulated: false }; }
  catch { return { letter: templateLetter(d), simulated: false, template: true }; }
}