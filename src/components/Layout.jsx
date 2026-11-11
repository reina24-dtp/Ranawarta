import { go, goHome } from "../nav";
import Footer from "./Footer";

const MENU = [
  ["Tentang", () => goHome("tentang"), "tentang"],
  ["Cara Kerja", () => goHome("cara-kerja"), "cara"],
  ["Peta", () => go("/peta"), "peta"],
  ["Wilayah Sunyi", () => go("/wilayah-sunyi"), "sunyi"],
  ["Lacak", () => go("/lacak"), "lacak"],
];

export function Navbar({ active }) {
  return (
    <header className="pg-nav">
      <button className="pg-brand" onClick={() => goHome("")} aria-label="Ranawarta, ke beranda">
        <img src="/logo.png" alt="Ranawarta" />
      </button>
      <nav aria-label="Menu utama">
        {MENU.map(([l, fn, k]) => (
          <button key={k} onClick={fn} className={active === k ? "on" : ""} aria-current={active === k ? "page" : undefined}>{l}</button>
        ))}
      </nav>
      <button className={`pg-lapor${active === "lapor" ? " on" : ""}`} onClick={() => go("/lapor")}>Lapor</button>
    </header>
  );
}

export function PageHead({ label, title }) {
  return (
    <section className="pg-head">
      <div className="pg-wrap"><small>{label}</small><h1>{title}</h1></div>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 45C220 -5 460 5 720 35S1200 70 1440 25V70H0Z" fill="#F4F7FB" />
      </svg>
    </section>
  );
}

export function PageFooter() {
  return <Footer />;
}
