# Ranawarta

Ranawarta adalah website pelaporan masalah fisik di ruang publik Kabupaten Sidoarjo (18 kecamatan). Warga cukup memotret masalah, mengirim laporan tanpa akun, lalu memantau statusnya lewat kode tiket sampai selesai.

## Tech Stack

- **React 18** (UI berbasis komponen)
- **Vite 5** (dev server dan build tool)
- **CSS murni** (animasi, transisi, dan layout responsif tanpa library UI)
- **SVG + GeoJSON** (peta 18 kecamatan Sidoarjo, sumber batas wilayah GADM 4.1)
- **Leaflet + leaflet.markercluster** (peta laporan, cluster, marker per status)
- **Google Fonts** (Lexend dan Manrope)

## Cara Menjalankan

Pastikan Node.js versi 18 atau lebih baru sudah terpasang.

```bash
# 1. Clone repository
git clone https://github.com/reina24-dtp/Ranawarta
cd ranawarta

# 2. Install dependency
npm install

# 3. Jalankan project
npm run dev
```

Buka alamat yang muncul di terminal (biasanya `http://localhost:5173`).

Untuk build produksi: `npm run build`, lalu `npm run preview`.

## Mengaktifkan AI

Ranawarta memakai AI untuk tiga hal (pemeriksa foto, pembanding foto, asisten draf surat), semuanya hanya saran berlabel. Kunci API hanya dibaca server (`server/ai-handlers.js`), tidak pernah masuk ke browser.

```bash
cp .env.example .env      # lalu isi GEMINI_API_KEY (atau kunci penyedia lain, lihat bawah)
npm run dev               # /api/ai/* otomatis aktif lewat server Vite
```

- Tanpa kunci atau tanpa sinyal: muncul "Pemeriksaan otomatis belum tersedia" dan aplikasi tetap bisa dipakai.
- Deploy ke Vercel: folder `api/` sudah siap; isi kunci AI (mis. `GEMINI_API_KEY`) di Environment Variables.

## Final Submission

Fitur utama Ranawarta untuk warga dan administrator sudah tersedia:

- [x] Landing page berisi informasi Ranawarta, alur pelaporan, peta 18 kecamatan, wilayah sunyi, laporan terbaru, pelacakan, dan footer.
- [x] Warga dapat mengirim laporan, melihat peta laporan, mendukung laporan, dan melacak status menggunakan kode tiket.
- [x] Halaman informasi, kotak masukan/keluhan warga, serta fitur bantuan AI tersedia.
- [x] Halaman **Admin** menyediakan ringkasan statistik, manajemen dan perubahan status laporan, moderasi laporan/foto, penanganan sengketa, pengelolaan keluhan, serta ekspor data CSV/JSON.
- [x] Supabase menjadi penyimpanan utama laporan, foto laporan, dukungan/suara warga, keluhan, konfirmasi warga, serta status dan moderasi Admin.
- [x] Halaman Admin menggunakan login Supabase dan hak Admin di database; pengelolaan laporan dan keluhan tersimpan terpusat, bukan di `localStorage`.

**Penyimpanan data:** saat online, laporan dan foto dikirim ke Supabase Database/Storage. Dukungan, suara warga, keluhan, konfirmasi, riwayat status, dan tindakan Admin juga disimpan di Supabase. Saat offline, laporan/foto, keluhan, suara, dan konfirmasi yang belum terkirim disimpan sementara di browser lalu disinkronkan saat koneksi kembali. Draf yang belum dikirim dan persetujuan penggunaan AI tetap berada di perangkat. Laporan contoh berasal dari seed.

## Struktur Folder

```
ranawarta/
├── api/
│   └── ai/
│       └── [action].js        # endpoint AI untuk deployment
├── public/                    # aset, logo, ikon, dan service worker
│   ├── data/                  # GeoJSON kecamatan
│   └── sample-photos/         # foto contoh laporan
├── server/
│   ├── ai-handlers.js         # handler AI untuk server lokal
│   └── vite-ai-plugin.js      # integrasi endpoint AI dengan Vite
├── src/
│   ├── components/            # komponen peta, laporan, footer, dan formulir
│   ├── content/               # konten halaman informasi
│   ├── data/                  # data kecamatan, status, dan laporan contoh
│   ├── lib/                   # repositori data, Supabase, sinkronisasi, dan utilitas
│   ├── pages/                 # halaman publik, pelaporan, pelacakan, peta, dan Admin
│   ├── App.jsx                # routing aplikasi
│   ├── admin.css              # gaya halaman Admin
│   └── *.css                  # gaya halaman dan komponen
├── supabase/
│   ├── schema.sql             # skema, view, dan fungsi database
│   └── seed.sql               # data contoh
├── index.html
├── package.json
└── vite.config.js
```

## Halaman Peta dan Kecamatan Paling Lengang

- Rute memakai hash: `#/peta`, `#/wilayah-sunyi`, `#/coming-soon`.
- Data laporan diambil dari view `public_reports` di Supabase saat online. Antrean laporan yang belum terkirim disimpan sementara di browser; seed lokal digunakan sebagai data contoh/fallback offline.
- Seed 41 laporan `DATA CONTOH` (`src/data/seed-reports.json`), titik berada di dalam poligon kecamatan.
- Ambang di `src/config.js` (`REAL_REPORTS_THRESHOLD`, `NEED_THRESHOLD`, `LOW_REPORTS`, parameter titik kronis).
- Peta dasar OSM; URL tile bisa diatur lewat `VITE_TILE_URL`. Buka lewat `localhost`/https, bukan file lokal.
- GeoJSON: `public/data/sidoarjo-kecamatan.geojson`; data kecamatan: `src/data/kecamatan-info.json`.

### Asumsi

- Stack tetap React (JavaScript) + Vite + CSS biasa + hash routing, bukan TypeScript/Tailwind/React Router.
- Titik kronis: radius 50 m, 6 bulan, minimal 3 laporan kategori sama.
- Laporan nyata = `is_demo=false`; selama kurang dari ambang, Lapisan 2 terkunci dan tidak ada kecamatan ditandai sunyi.

## Halaman Lapor dan Lacak

Rute: `#/lapor`, `#/lacak`, `#/lacak/RW-XXXX`. Tombol "Lapor" (navbar, landing) membuka `#/lapor`; kolom Lacak di landing membuka `#/lacak/<kode>`.

### AI

- Semua panggilan lewat `/api/ai/check-photo`, `/api/ai/compare`, `/api/ai/draft-letter` (plugin Vite lokal dan fungsi serverless Vercel). Kunci API hanya boleh di server, jangan di klien.
- Pemeriksaan foto harus memiliki hasil lengkap dan sesuai skema. Jika layanan AI gagal atau hasilnya tidak lengkap, foto ditandai belum dapat dipastikan—aplikasi tidak menebak bahwa foto valid.
- Mengganti penyedia (mis. Gemini): ubah implementasi fungsi server; syarat dan batas tingkat gratis perlu dicek tim.
- Foto dikirim ke AI hanya setelah pengguna menekan tombol cek (persetujuan singkat); foto bisa memuat wajah/plat nomor.

### Variabel env

- `VITE_TILE_URL` (opsional): URL tile peta; default OpenStreetMap (atribusi tampil di peta).
- `AI_API_KEY`: hanya untuk server AI (belum ada di proyek ini).

### Menguji

- Buka lewat `localhost`/https (bukan file lokal): OSM menolak permintaan tanpa Referer dan kamera hanya jalan di alamat aman.
- Offline/PWA: `npm run build && npm run preview`, buka sekali saat online, lalu DevTools > Network > Offline. Service worker hanya aktif di build produksi.
- Simulasi gagal kirim: `localStorage.setItem("rw:simfail","1")` di console (hapus dengan `removeItem`).

### Keterbatasan dan asumsi

- Stack tetap React JavaScript + Vite + CSS biasa + hash routing (bukan TypeScript/Tailwind/React Router/turf.js).
- "Kamera saja" tidak bisa dipaksa 100% di semua browser; cadangan `capture` kadang tetap membuka pilihan galeri di sebagian perangkat.
- Background Sync belum dipakai; laporan tertunda dikirim saat browser kembali online atau Ranawarta dibuka lagi.
- Data browser (terutama iOS) bisa terhapus; jangan menumpuk draf lama.

## Footer, halaman informasi, dan logo

- Komponen `src/components/Footer.jsx` dipakai di semua halaman (landing, Peta, Wilayah Sunyi, Lapor, Lacak, Coming Soon, dan empat halaman informasi). Desktop 4 kolom, tablet 2 kolom, ponsel 1 kolom. Tidak ada kolom Kontak; kontak hanya di `#/tim`.
- Peta mini di footer memakai data kecamatan dari GeoJSON (`src/data/kecamatan.js`, dibuat dari `public/data/sidoarjo-kecamatan.geojson`); jika datanya kosong, peta mini disembunyikan tanpa galat.
- Empat halaman informasi: `#/privasi`, `#/sumber-data`, `#/cara-ai`, `#/tim`. Isinya ada di `src/content/*.js` (mudah diedit). Teks `[ISI ...]` otomatis tampil sebagai kotak kuning bergaris putus-putus.
- PENTING: `#/privasi` adalah DRAF yang perlu ditinjau tim dan bukan nasihat hukum.
- Logo (dari file transparan yang kamu kirim, diperkecil dan dipangkas): `public/logo.png` (latar terang), `public/logo-white.png` (latar gelap; bagian biru tua diubah putih, bagian teal tetap), `public/logo-icon.png` dan `public/favicon.png` (ikon saja). Ganti file ini bila logo diperbarui.
- Catatan: `public/` memuat gambar hero berukuran besar; kompres sebelum rilis.

## Laporan terbaru (landing) dan urutan terdekat (Peta)

- **Landing page**: bagian "Laporan terbaru" (`src/components/LatestReports.jsx`, gaya di `latest.css`) berada di bawah "Jelajahi Sidoarjo". Isinya OVERVIEW 10 laporan terbaru (urut waktu, tanpa meminta lokasi): foto contoh, kategori, kecamatan, umur laporan, status (bentuk ikon + label), jumlah dukungan, dan tombol Dukung (sekali per laporan per perangkat). Jumlah kartu diatur lewat konstanta `LIMIT` di komponen itu.
- Sepuluh laporan itu menampilkan laporan terbaru dari Supabase saat online; seed lokal (41 laporan berlabel `DATA CONTOH`) menjadi fallback/data contoh saat Supabase tidak digunakan atau offline.
- **Halaman Peta**: tombol "Pakai lokasiku" (izin lokasi diminta hanya saat ditekan). Saat aktif: kartu samping menampilkan "Terdekat darimu" (3 laporan beserta jarak), mode Daftar otomatis terurut dari yang terdekat dengan kolom Jarak, kartu laporan terpilih menampilkan jarak, dan peta menandai lokasimu lalu diarahkan ke laporan terdekat. Tanpa izin lokasi, tampilan tetap urut terbaru.
- Perbaikan kecil: tombol `pg-pill` aktif tidak lagi pucat saat disorot kursor.
- Laporan contoh memakai foto ilustrasi lokal per kategori; foto laporan warga disimpan di Supabase Storage dan ditampilkan pada kartu detail.

### Angka Wilayah Sunyi (`src/config.js`)

| Pengaturan | Sebelumnya | Sekarang | Alasan |
|---|---|---|---|
| `REAL_REPORTS_THRESHOLD` | 100 | **180** | 18 kecamatan x rata-rata 10 laporan. Pada 100 laporan rata-ratanya hanya 5-6, jadi kecamatan yang kebetulan dapat 2 laporan belum tentu benar-benar "sunyi". |
| `LOW_REPORTS` | 2 | 2 | Pada rata-rata 10, angka 2 sudah jauh di bawah rata-rata. |
| `NEED_THRESHOLD` | 60 | 60 | Dari indeks awal hanya 4 kecamatan lolos (Waru, Taman, Candi, Porong); Gedangan dan Tanggulangin (58) tepat di bawah garis. |

Teks di halaman Sumber data ikut diperbarui (180, 60, 2).

### Dukungan laporan tersimpan permanen (Supabase)

- Database: `supabase/schema.sql` (jalankan dulu), lalu `supabase/seed.sql` (41 laporan contoh, `is_demo = true`).
- Kode: `src/lib/supabase.js` (fetch ke REST API, **tanpa paket tambahan**), `src/lib/support.js`, `src/lib/reportsRepo.js` (sudah tersambung ke tombol Dukung di Landing, Peta, dan Lapor).
- Isi `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), di Vercel isi variabel yang sama lalu redeploy.
- Satu perangkat hanya bisa mendukung sekali per laporan (dijaga kunci utama `(report_id, device_id)`). Offline: masuk antrean dan terkirim saat online.
- Batas: ID perangkat hilang bila data browser dihapus, jadi ini pencegah dukung ganda biasa, bukan bukti satu orang satu suara.