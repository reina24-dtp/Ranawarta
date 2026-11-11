import { Suspense, lazy, useEffect, useRef, useState } from "react";
import "./styles.css";
import SidoarjoMap from "./components/SidoarjoMap";
import Footer from "./components/Footer";
import LatestReports from "./components/LatestReports";

/* ====== EDIT DI SINI: slide hero (gambar + headline + sub headline) ====== */
const SLIDES = [
  {
    img: "/hero-1.png", // taruh gambar di /public/hero-1.jpg
    title: "Cukup satu foto, laporan langsung jalan.",
    sub: "Ada yang rusak di sekitarmu? Potret, kirim tanpa akun, lalu pantau sampai selesai.",
  },
  {
    img: "/hero-2.jpg", // taruh gambar di /public/hero-2.jpg
    title: "Lapor sekali,pantau sampai tuntas.",
    sub: "Setiap laporan punya kode tiket. Cek statusnya kapan saja dan lihat posisinya di peta publik.",
  },
  {
    img: "/hero-3.png", // taruh gambar di /public/hero-3.jpg
    title: "Selesai kalau warga bilang selesai.",
    sub: "Setelah petugas menyatakan selesai, kamu yang memastikan langsung di lokasi.",
  },
];

/* kecamatan terlengang (urutan = nomor di peta) & pembanding */
const QUIET = ["jabon", "sedati", "balongbendo"];
const RING = "taman";

// Isi image dengan path gambar di public/, misalnya "/cara-kerja-foto.png".
const HOW_STEPS = [
  { title: "Foto", description: "Potret masalah yang kamu temui, seperti jalan berlubang atau lampu yang mati.", image: "/langkah-1-foto.svg" },
  { title: "Lokasi", description: "Tandai tempatnya di peta atau pakai lokasimu saat ini.", image: "/langkah-2-lokasi.svg" },
  { title: "Kirim", description: "Kirim laporan dan simpan kode tiketmu untuk memantau statusnya.", image: "/langkah-3-kirim.svg" },
];

const PetaPage = lazy(() => import("./pages/PetaPage"));
const LengangPage = lazy(() => import("./pages/LengangPage"));
const LaporPage = lazy(() => import("./pages/LaporPage"));
const LacakPage = lazy(() => import("./pages/LacakPage"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const INFO = ["privasi", "sumber-data", "cara-ai", "tim"];

const NAV = [
  ["Tentang", "tentang"],
  ["Cara Kerja", "cara-kerja"],
  ["Peta", "peta"],
  ["Wilayah Sunyi", "wilayah-sunyi"],
  ["Lacak", "lacak"],
];

const ICONS = {
  info: "M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z",
  swap: "M4 7h13l-3-3M20 17H7l3 3M4 7v3M20 17v-3",
  pin: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  radar: "M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0M8 8a5.6 5.6 0 000 8M16 8a5.6 5.6 0 010 8M5 5a10 10 0 000 14M19 5a10 10 0 010 14",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3M8 11h6",
  send: "M3 11l18-8-8 18-2-8-8-2z",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  checks: "M18 6L7 17l-5-5M22 10l-7.5 7.5L13 16",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
};
const Icon = ({ n, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONS[n]} />
  </svg>
);

const useHash = () => {
  const [h, setH] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setH(window.location.hash);
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return h;
};
const goSoon = () => { window.location.hash = "/coming-soon"; window.scrollTo(0, 0); };
const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

const Logo = ({ dark }) => (
  <a className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
    <img className="brand-img" src="/logo-white.png" alt="Ranawarta" />
  </a>
);

const Btn = ({ children, className = "", to = "/coming-soon" }) => (
  <button className={`btn ${className}`} onClick={() => { window.location.hash = to; window.scrollTo(0, 0); }}>{children}</button>
);

function ComingSoon() {
  return (
    <>
    <div className="soon">
      <img src="/logo-white.png" alt="Ranawarta" style={{ height: 60 }} />
      <h1>Coming Soon</h1>
      <p>Halaman ini masih dalam proses build. Nantikan segera!</p>
      <button className="btn" onClick={() => (window.location.hash = "")}>← Kembali ke beranda</button>
      <i className="orb o1" /><i className="orb o2" />
    </div>
    <Footer />
    </>
  );
}

export default function App() {
  const hash = useHash();
  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [ticket, setTicket] = useState("");

  useEffect(() => { if (window.location.hash.startsWith("#/")) window.scrollTo(0, 0); }, [hash]);
  useEffect(() => {
    const advanceSlide = () => {
      if (document.visibilityState !== "visible") return;
      setSlide((current) => (current + 1) % SLIDES.length);
    };
    const timer = setInterval(advanceSlide, 5500);
    return () => {
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  if (hash === "#/coming-soon") return <ComingSoon />;
  const route = hash.startsWith("#/lacak") ? "lacak" : hash.slice(2);
  const PAGES = { peta: PetaPage, "wilayah-sunyi": LengangPage, lapor: LaporPage, lacak: LacakPage, admin: AdminPage };
  if (INFO.includes(route)) {
    return <Suspense fallback={<div className="soon"><p>Memuat halaman…</p></div>}><InfoPage slug={route} /></Suspense>;
  }
  if (hash.startsWith("#/") && PAGES[route]) {
    const Page = PAGES[route];
    const code = route === "lacak" ? decodeURIComponent(hash.slice(8)) : "";
    return <Suspense fallback={<div className="soon"><p>Memuat halaman…</p></div>}><Page key={code} code={code} /></Suspense>;
  }

  const circles = [["Tentang", "info", "tentang"], ["Cara Kerja", "swap", "cara-kerja"], ["Peta", "pin", "peta"], ["Wilayah Sunyi", "radar", "wilayah-sunyi"], ["Lacak", "search", "lacak"]];
  const density = [["1", 652, 10, "Jabon"], ["2", 1175, 18, "Sedati"], ["3", 1637, 25, "Balongbendo"], ["4", 6310, 100, "Taman (pembanding, terpadat)"]];
  return (
    <>
      <header className={`nav ${scrolled ? "solid" : ""}`}>
        <Logo />
        <nav id="menu-utama" className={menu ? "open" : ""}>{NAV.map(([l, id]) => <a key={id} role="button" tabIndex={0} onClick={() => { setMenu(false); goTo(id); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMenu(false); goTo(id); } }}>{l}</a>)}</nav>
        <div className="nav-right">
          <Btn className="sm" to="/lapor">Lapor</Btn>
          <button className="nav-toggle" aria-label={menu ? "Tutup menu" : "Buka menu"} aria-expanded={menu} aria-controls="menu-utama" onClick={() => setMenu(!menu)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="slides">
          {SLIDES.map((s, i) => (
            <div
              key={s.img}
              className={`slide${i === slide ? " active" : ""}`}
              aria-hidden={i !== slide}
              style={{ backgroundImage: `linear-gradient(rgba(10,30,40,.35),rgba(10,30,40,.35)), url(${s.img})` }}
            >
              <div className="hero-text">
                <h1>{s.title}</h1>
                <p>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="dots">{SLIDES.map((_, i) => <button key={i} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />)}</div>
        <svg className="wave" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0 68C90 40 130 22 220 54S350 88 425 49 545 0 620 27 725 81 800 72 900 39 970 50 1070 86 1140 82 1260 59 1325 72 1400 91 1440 96V100H0Z" fill="#fff" />
          <path d="M80 55C145 22 175 22 235 54S330 88 390 43 500 -8 560 22 635 74 700 71 820 28 885 42 980 86 1045 78 1155 48 1220 62C1260 71 1295 81 1335 83C1375 85 1410 93 1440 96" fill="none" stroke="#fff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </section>

      {/* LINGKARAN NAVIGASI */}
      <section className="circles">
        {circles.map(([l, ic, id], i) => (
          <Reveal key={id} delay={i * 80}>
            <button className="circle-item" onClick={() => goTo(id)}>
              <span className="circle"><Icon n={ic} size={36} /></span>
              <span>{l}</span>
            </button>
          </Reveal>
        ))}
      </section>

      {/* TENTANG */}
      <section id="tentang" className="wrap about">
        <Reveal className="about-text">
          <small className="eyebrow">KENAPA RANAWARTA ADA</small>
          <h2>Warga sudah bergerak.<br />Yang kurang: kepastian.</h2>
          <p>Ranawarta adalah website pelaporan masalah fisik di ruang publik Sidoarjo. Tanpa akun, setiap laporan mendapat kode tiket dan statusnya bisa dilihat siapa saja.</p>
        </Reveal>
        <div className="frame">
          <img src="/about.png" alt="" />
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        </div>
      </section>

      <Reveal className="wrap stats">
        {[["2,04 juta", "Warga Sidoarjo", "Wilayah padat, masalah jalan cepat dirasakan banyak orang.", "Open Data Kabupaten Sidoarjo (Dispendukcapil), semester I 2025"],
          ["Des 2025", "Hujan dan Jalan rusak", "Genangan dan kerusakan jalan muncul di sejumlah titik.", "detikJatim, 3 Des 2025"],
          ["Feb 2026", "Warga menambal sendiri", "Jalan berlubang ditambal swadaya, tanda sistem perlu dibenahi.", "TIMES Indonesia, 25 Feb 2026"]].map(([n, l, d, s]) => (
          <div key={n} className="stat"><h3>{n}</h3><b>{l}</b><p>{d}</p><em>Sumber: {s}</em></div>
        ))}
      </Reveal>

      <Reveal className="wrap">
        <div className="journey">
          <small className="eyebrow dark">PERJALANAN SATU LAPORAN</small>
          <div className="steps4">
            {[["send", "Dikirim", "Kode tiket terbit"], ["wrench", "Diproses", "Ditangani Petugas"], ["checks", "Selesai", "Kata Petugas"], ["camera", "Dikonfirmasi", "Oleh Pelapor"]].map(([ic, t, s], i) => (
              <div key={t} className="s4" style={{ transitionDelay: `${i * 120}ms` }}>
                <span className={`dot ${i === 3 ? "navy" : ""}`}><Icon n={ic} size={22} /></span>
                <b>{t}</b><span>{s}</span>
              </div>
            ))}
          </div>
          <hr /><p>Hanya pelapor yang bisa menyatakan “Ya, sudah selesai” setelah memotret lokasi langsung.</p>
        </div>
      </Reveal>

      {/* CARA KERJA */}
      <section id="cara-kerja" className="how">
        <svg className="top-wave" viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0 80V40C200 -10 380 0 560 30s420 30 600-10c100-22 200-10 280 10v50z" fill="#dff3f0" /></svg>
        <div className="wrap">
          <Reveal><small className="eyebrow">CARA KERJA</small>
            <h2 className="spaced">Tiga langkah, tanpa akun.</h2>
            <p className="lead">Dari foto sampai kode tiket, semuanya bisa kamu lakukan langsung dari ponselmu.</p></Reveal>
          <div className="steps3">
            {HOW_STEPS.map(({ title, description, image }, i) => (
              <Reveal key={title} delay={i * 140} className="step3">
                <div className="num"><span>{i + 1}</span><hr /></div>
                <div className="card">{image && <img className="step-image" src={image} alt={`Ilustrasi ${title}`} />}</div>
                <h4>{title}</h4><p>{description}</p>
              </Reveal>
            ))}
          </div>
          <Btn to="/lapor">Lapor Sekarang</Btn>
        </div>
      </section>

      {/* PETA */}
      <section id="peta" className="wrap peta">
        <Reveal>
          <h3 className="spaced">Jelajahi Sidoarjo</h3>
          <p>Lihat di mana saja laporan warga berada, dari Waru sampai Jabon.</p>
          <p>Peta ini menampilkan laporan di 18 kecamatan beserta statusnya, sehingga kamu bisa memeriksa apakah masalah di sekitarmu sudah dilaporkan atau belum.</p>
          <p>Terbuka untuk siapa saja, tanpa perlu akun.</p>
          <Btn to="/peta">Buka Peta</Btn>
        </Reveal>
        <Reveal delay={150}><SidoarjoMap className="map float" interactive /></Reveal>
      </section>

      {/* LAPORAN TERBARU (overview 10 laporan terbaru) */}
      <Reveal><LatestReports /></Reveal>

      {/* WILAYAH SUNYI */}
      <section id="wilayah-sunyi" className="quiet">
        <svg className="top-wave" viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0 80V50C240 -20 420 10 640 40s480 20 800-30v70z" fill="#0f7f78" /></svg>
        <div className="wrap quiet-grid">
          <Reveal>
            <small className="eyebrow light">KECAMATAN PALING LENGANG</small>
            <h2 className="spaced">Di wilayah yang lengang, masalah bisa lebih lama tak terlihat.</h2>
            <p>Kami menandai tiga kecamatan dengan kepadatan penduduk terendah di Sidoarjo. Bisa jadi laporan dari sana lebih sedikit. Dugaan ini yang ingin kami uji lewat laporan warga.</p>
            <b>Kepadatan penduduk (jiwa per km²)</b>
            <div className="bars">
              {density.map(([n, v, w, name]) => (
                <div key={n} className="bar">
                  {n === "4"
                    ? <span className="rank dashed" aria-hidden="true" />
                    : <span className="rank">{n}</span>}
                  <div className="bcol"><span className="bname">{name}</span><i><u style={{ "--w": `${w}%` }} /></i></div>
                  <em>{v.toLocaleString("id-ID")}</em>
                </div>
              ))}
            </div>
            <p className="note"><b>Jabon hampir sepuluh kali lebih lengang daripada Taman.</b><br />Sumber: Open Data Kabupaten Sidoarjo (Dispendukcapil), kepadatan penduduk Juni 2022</p>
            <Btn className="white" to="/wilayah-sunyi">Lihat Peta Kepadatan</Btn>
          </Reveal>
          <Reveal delay={150} className="quiet-map">
            <SidoarjoMap className="map" fill="#1fb8a4" highlight={QUIET} ring={RING} />
            <p>Batas wilayah: GADM 4.1, perkiraan. Lingkaran putus-putus: Taman, pembanding.</p>
          </Reveal>
        </div>
      </section>

      {/* LACAK */}
      <section id="lacak" className="track">
        <Reveal>
          <small className="eyebrow center">LACAK</small>
          <h2 className="spaced center">Sudah lapor? Pantau di sini.</h2>
          <p className="center">Masukkan kode tiket untuk melihat status laporanmu kapan saja, tanpa login.</p>
          <div className="ticket">
            <label>KODE TIKET
              <input value={ticket} onChange={(e) => setTicket(e.target.value.toUpperCase())} placeholder="RW-XXXX" />
            </label>
            <i className="perf" />
            <button className="track-btn" onClick={() => { window.location.hash = ticket ? `/lacak/${ticket}` : "/lacak"; window.scrollTo(0, 0); }}><span>Lacak</span></button>
          </div>
        </Reveal>
      </section>

      <Footer />
    </>
  );
}
