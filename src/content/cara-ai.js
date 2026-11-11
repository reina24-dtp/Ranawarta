export default {
  title: "Cara AI dipakai",
  intro: ["AI di Ranawarta hanya membantu menyaring dan memberi saran. Semua hasilnya berlabel \"Saran AI, bukan keputusan\"."],
  sections: [
    { h: "Prinsip", p: [
      "AI tidak mengubah status laporan, tidak menolak laporan, dan tidak mengirim apa pun secara otomatis. Keputusan akhir tetap di tangan manusia.",
      "Jika jawabanmu berbeda dari saran AI, laporan hanya ditandai \"perlu ditinjau\" untuk moderator. Tidak ada penolakan atau perubahan status."] },
    { h: "Tiga peran AI", ul: [
      "Pemeriksa foto saat melapor: foto buram atau gelap dicek di perangkatmu. Saat online, AI memberi saran apakah foto tampak sesuai kategori yang kamu pilih. Kamu bebas memakai atau mengabaikan saran itu.",
      "Pembanding foto saat konfirmasi: membandingkan foto laporan awal dengan foto konfirmasimu, lalu memberi saran \"lokasi tampak sama\" dan \"masalah tampak masih ada atau sudah tidak ada\". Jawaban \"selesai\" atau \"belum selesai\" tetap dari kamu.",
      "Asisten draf surat: menyusun draf surat eskalasi dari data laporan (kategori, kecamatan, tanggal, jumlah dukungan, riwayat status) tanpa identitas pelapor. Drafnya bisa kamu edit, lalu kirim sendiri. Ranawarta tidak mengirim surat otomatis."] },
    { h: "Kapan AI tidak berjalan", ul: [
      "Tanpa sinyal: pemeriksaan foto dan perbandingan foto menunggu sampai ada sinyal. Laporan dan konfirmasimu tetap tersimpan dan tidak menunggu AI.",
      "Layanan AI gagal, lambat, atau batas pemakaiannya habis: muncul pesan \"Pemeriksaan otomatis belum tersedia\". Kamu tetap bisa melapor, mengonfirmasi, dan mengirim. Tidak ada hasil tiruan yang ditampilkan.",
      "Draf surat: bila AI tidak tersedia, kamu mendapat templat surat biasa yang diberi label \"bukan AI\"."] },
    { h: "Data yang dikirim ke AI", p: [
      "Yang dikirim hanya saat kamu menekan tombol AI: foto terkompresi tanpa metadata (tanpa lokasi GPS dan waktu), atau data laporan tanpa identitas pelapor.",
      "Penyedia layanan AI: Google (Gemini), lewat server perantara Ranawarta. Kunci API hanya ada di server, tidak di browser. Rincian ada di [[/privasi|Kebijakan privasi]]."] },
    { h: "Batasan", ul: [
      "AI bisa salah. Sudut foto, cahaya, dan cuaca memengaruhi hasil. Karena itu hasilnya hanya saran.",
      "AI ini bukan pendeteksi foto asli. Ia tidak membuktikan foto itu asli atau tidak diedit.",
      "Foto dari kamera langsung mempersulit pemalsuan, tetapi tidak membuktikan keaslian."] },
  ],
};
