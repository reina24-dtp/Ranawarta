// Ambang & pengaturan (BELUM divalidasi; sesuaikan oleh tim)
export const CHRONIC_RADIUS_M = 50;      // radius titik kronis
export const CHRONIC_DAYS = 180;         // rentang 6 bulan
export const CHRONIC_MIN = 3;            // minimal laporan
export const REAL_REPORTS_THRESHOLD = 180; // 18 kecamatan x rata-rata 10 laporan; pada 100 laporan rata-ratanya cuma 5-6 per kecamatan, sehingga 2 laporan belum tentu berarti "sunyi"
export const NEED_THRESHOLD = 60;        // need_index minimal untuk tanda "sunyi" (dari indeks awal hanya 4 kecamatan lolos: Waru, Taman, Candi, Porong)
export const LOW_REPORTS = 2;            // laporan nyata maksimal untuk tanda "sunyi" (jauh di bawah rata-rata 10 per kecamatan)
export const STALL_DAYS = 14;   // laporan dianggap mandek (tangga eskalasi)
export const CONFIRM_DAYS = 7;  // batas waktu pelapor mengonfirmasi (selesai, belum dikonfirmasi)
