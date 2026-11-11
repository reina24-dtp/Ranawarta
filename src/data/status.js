export const STATUS = {
  diterima:      { label: "Diterima",            long: "Diterima",                  color: "#6B7C93", shape: "circle" },
  diverifikasi:  { label: "Diverifikasi",        long: "Diverifikasi",              color: "#2563EB", shape: "square" },
  dikerjakan:    { label: "Dikerjakan",          long: "Dikerjakan",                color: "#B45309", shape: "triangle" },
  selesai_dinas: { label: "Selesai (petugas)",   long: "Selesai (menurut petugas)", color: "#0F766E", shape: "diamond" },
  terkonfirmasi: { label: "Terkonfirmasi warga", long: "Terkonfirmasi warga",       color: "#15803D", shape: "check" },
  disengketakan: { label: "Disengketakan",       long: "Disengketakan",             color: "#B91C1C", shape: "alert" },
};
export const STATUS_ORDER = Object.keys(STATUS);
export const CATEGORIES = ["Jalan rusak", "Lampu jalan mati", "Sampah menumpuk", "Saluran tersumbat", "Banjir atau genangan", "Fasilitas umum rusak", "Rambu atau marka rusak"];

// Status tambahan (tidak masuk filter/legenda peta)
export const STATUS_EXTRA = {
  selesai_belum_dikonfirmasi: { label: "Selesai, belum dikonfirmasi", long: "Selesai, belum dikonfirmasi", color: "#0F766E", shape: "diamond" },
  menunggu: { label: "Menunggu terkirim", long: "Menunggu terkirim", color: "#6B7C93", shape: "circle" },
};
export const statusMeta = (k) => STATUS[k] || STATUS_EXTRA[k] || STATUS.diterima;
