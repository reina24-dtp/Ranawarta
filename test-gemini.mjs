// Tes langsung ke Google: model mana yang bisa dipakai kunci ini, dan secepat apa.
// Jalankan di folder proyek:  node test-gemini.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const key = env.GEMINI_API_KEY;
if (!key) { console.log("GEMINI_API_KEY tidak ditemukan di .env"); process.exit(1); }
console.log("Kunci terbaca, panjang:", key.length, "(isi kunci tidak ditampilkan)");

async function call(url, opt = {}, ms = 25000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms), s = Date.now();
  try { const r = await fetch(url, { ...opt, signal: c.signal }); return { status: r.status, ms: Date.now() - s, txt: await r.text() }; }
  catch (e) { return { status: 0, ms: Date.now() - s, txt: e.message }; }
  finally { clearTimeout(t); }
}

const list = await call("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
console.log("\n1) Daftar model dari Google ->", list.status === 200 ? "OK" : "GAGAL", `(${list.status}, ${list.ms} ms)`);
if (list.status !== 200) { console.log(list.txt.slice(0, 400)); console.log("\nKalau status 0: komputer/jaringanmu tidak bisa menjangkau Google. Kalau 400/403: kuncinya bermasalah."); process.exit(1); }

const all = JSON.parse(list.txt).models
  .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
  .map((m) => m.name.replace("models/", ""));
const cand = all.filter((n) => /flash/.test(n) && !/(image|tts|live|audio|embed|robotics|computer|native)/.test(n)).sort().reverse().slice(0, 6);
console.log("Model Flash yang tersedia:", cand.join(", ") || "(tidak ada)");

// gambar 1x1 piksel untuk menguji kemampuan membaca gambar
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const body = { contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/png", data: PNG } }, { text: "Jawab satu kata: ini gambar apa?" }] }], generationConfig: { temperature: 0, maxOutputTokens: 256 } };

console.log("\n2) Uji tiap model (dengan gambar):");
const hasil = [];
for (const m of cand) {
  const r = await call(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
  let ket = r.txt.replace(/\s+/g, " ").slice(0, 110);
  if (r.status === 200) { try { ket = "jawaban: " + (JSON.parse(r.txt).candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim().slice(0, 60); } catch {} }
  console.log(` - ${m.padEnd(34)} status ${String(r.status).padEnd(4)} ${String(r.ms).padStart(6)} ms  ${ket}`);
  if (r.status === 200) hasil.push({ m, ms: r.ms });
}
hasil.sort((a, b) => a.ms - b.ms);
console.log("\nKESIMPULAN:");
if (hasil.length) console.log(`Pakai di .env ->  AI_MODEL=${hasil[0].m}   (paling cepat: ${hasil[0].ms} ms)`);
else console.log("Tidak ada model yang berhasil. Kirim seluruh teks di atas ke aku.");
