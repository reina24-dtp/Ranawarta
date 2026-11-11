import { goHome } from "../nav";
import SidoarjoMap from "./SidoarjoMap";
import { KECAMATAN } from "../data/kecamatan";
import "./footer.css";

const JELAJAHI = [
  ["Tentang", "#/", () => goHome("tentang")],
  ["Cara Kerja", "#/", () => goHome("cara-kerja")],
  ["Peta", "#/peta"],
  ["Wilayah Sunyi", "#/wilayah-sunyi"],
  ["Lacak", "#/lacak"],
];
const INFORMASI = [
  ["Kebijakan privasi", "#/privasi"],
  ["Sumber data dan metodologi", "#/sumber-data"],
  ["Cara AI dipakai", "#/cara-ai"],
  ["Tentang tim", "#/tim"],
];

function Links({ items, label }) {
  return (
    <nav aria-label={label}>
      <h2>{label}</h2>
      <ul>
        {items.map(([t, href, fn]) => (
          <li key={t}>
            <a href={href} onClick={fn ? (e) => { e.preventDefault(); fn(); } : () => window.scrollTo(0, 0)}>{t}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-in">
        <div className="ft-grid">
          <div>
            <a className="ft-logo" href="#/" aria-label="Ranawarta, ke beranda" onClick={(e) => { e.preventDefault(); window.location.hash = ""; window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <img src="/logo-white.png" alt="Ranawarta" />
            </a>
            <p className="ft-tag">Cukup satu foto, laporan langsung jalan.</p>
            <p className="ft-note">Bukan kanal resmi pemerintah.</p>
          </div>
          <Links items={JELAJAHI} label="Jelajahi" />
          <Links items={INFORMASI} label="Informasi" />
          {KECAMATAN?.length > 0 && (
            <div className="ft-map">
              <SidoarjoMap fill="#087878" stroke="#E0F0F0" />
              <p>Kabupaten Sidoarjo, Jawa Timur</p>
            </div>
          )}
        </div>
        <div className="ft-bottom">
          <p className="ft-attr">Peta dasar © OpenStreetMap contributors · Batas wilayah: GADM 4.1 (perkiraan) · Data penduduk: Open Data Kab. Sidoarjo (Dispendukcapil)</p>
          <p className="ft-copy">© {new Date().getFullYear()} Ranawarta</p>
        </div>
      </div>
    </footer>
  );
}
