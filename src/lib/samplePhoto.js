// Foto asli per kategori laporan untuk data contoh / demonstrasi.
const REAL_PHOTOS = {
  "Jalan rusak": "/sample-photos/jalan-rusak.jpg",
  "Lampu jalan mati": "/sample-photos/lampu-jalan-mati.jpg",
  "Sampah menumpuk": "/sample-photos/sampah-menumpuk.jpg",
  "Saluran tersumbat": "/sample-photos/saluran-tersumbat.jpg",
  "Banjir atau genangan": "/sample-photos/banjir-genangan.jpg",
  "Fasilitas umum rusak": "/sample-photos/fasilitas-rusak.jpg",
  "Rambu atau marka rusak": "/sample-photos/rambu-rusak.jpg",
};

export function samplePhoto(category) {
  return REAL_PHOTOS[category] || "/sample-photos/jalan-rusak.jpg";
}
export default samplePhoto;
