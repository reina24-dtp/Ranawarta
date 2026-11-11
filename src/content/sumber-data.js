import { SOURCES, SOURCES_INTRO } from "../data/sources";
export default {
  title: "Sumber data dan metodologi",
  updated: "10 November 2026",
  intro: ["Halaman ini membedakan mana yang fakta, mana yang hitungan tim, dan mana yang contoh."],
  sections: [
    { h: "Fakta, turunan, dan contoh",
      table: { head: ["Fakta", "Turunan", "Contoh"], rows: [
        ["Jumlah penduduk: Open Data Kabupaten Sidoarjo (Dispendukcapil), semester I 2025.", "Skor banjir: hitungan tim.", "Laporan seed, selalu berlabel \"DATA CONTOH\"."],
        ["Kepadatan penduduk: dataset Juni 2022. Tautan: {{https://opendata.sidoarjokab.go.id/dataset/kepadatan-penduduk-menurut-kecamatan|Portal Satu Data / Open Data Sidoarjo}}.", "Indeks kebutuhan awal: hitungan tim.", "–"],
      ] } },
    { h: "Batas wilayah", p: ["Batas wilayah memakai GADM 4.1 dan bersifat perkiraan. Bisa berbeda dari batas resmi terkini."] },
    { h: "Skor banjir", p: ["Skor banjir adalah jumlah sumber independen yang menyebut kecamatan itu sebagai wilayah banjir atau genangan (maksimal 5). Ini frekuensi disebut, bukan tingkat bahaya. Skor 0 berarti tidak disebut, bukan berarti aman."] },
    { h: "Indeks kebutuhan awal", p: ["Indeks = 50% kepadatan (diskalakan) ditambah 50% skor banjir (diskalakan), dikali 100. Ini rumus tim dan belum divalidasi."] },
    { h: "Wilayah sunyi", p: ["Tanda wilayah sunyi hanya muncul setelah laporan nyata terkumpul sampai ambang 180 laporan (18 kecamatan dengan rata-rata sekitar 10 laporan per kecamatan).", "Kecamatan ditandai bila indeks kebutuhan ≥ 60 dan laporan nyata ≤ 2. Ambang ini belum divalidasi.", "Sunyi bukan berarti tidak ada masalah."] },
    { h: "Daftar sumber banjir (S1 sampai S7)", p: [SOURCES_INTRO], ul: SOURCES.map((x) => `${x.code} · ${x.text}. ${x.what} ${x.url ? `{{${x.url}|Buka sumber}}` : "Tautan menyusul."}`) },
    { h: "Batasan", ul: ["Data kepadatan baru tersedia untuk sebagian kecamatan.", "Tahun sebagian sumber banjir tidak jelas.", "Semua angka hasil hitungan tim bukan angka resmi."] },
  ],
};
