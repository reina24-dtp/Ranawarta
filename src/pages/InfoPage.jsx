import { Navbar, PageHead } from "../components/Layout";
import Footer from "../components/Footer";
import ComplaintBox from "../components/ComplaintBox";
import privasi from "../content/privasi";
import sumber from "../content/sumber-data";
import caraAi from "../content/cara-ai";
import tim from "../content/tim";
import "../pages.css";

const PAGES = { privasi, "sumber-data": sumber, "cara-ai": caraAi, tim };

/** [ISI ...] -> kotak kosong bertanda; [[/rute|teks]] -> tautan dalam situs; {{https://...|teks}} -> tautan luar */
function Rich({ text }) {
  return text.split(/(\[ISI[^\]]*\]|\[\[[^\]]+\]\]|\{\{[^}]+\}\})/g).map((t, i) => {
    if (/^\[ISI/.test(t)) return <mark key={i} className="pg-isi" title="Bagian ini belum diisi tim">{t}</mark>;
    const x = t.match(/^\{\{(https?:[^|]+)\|([^}]+)\}\}$/);
    if (x) return <a key={i} className="pg-inlink" href={x[1]} target="_blank" rel="noopener noreferrer">{x[2]}</a>;
    const m = t.match(/^\[\[([^|]+)\|([^\]]+)\]\]$/);
    if (m) return <a key={i} className="pg-inlink" href={`#${m[1]}`} onClick={() => window.scrollTo(0, 0)}>{m[2]}</a>;
    return t;
  });
}

export default function InfoPage({ slug }) {
  const page = PAGES[slug];
  return (
    <div className="pg">
      <Navbar />
      <PageHead label="INFORMASI" title={page.title} />
      <main className="pg-wrap pg-info">
        {page.updated && <p className="pg-muted">Terakhir diperbarui: <Rich text={page.updated} /></p>}
        {page.intro.map((t, i) => <p key={i} className="pg-lead"><Rich text={t} /></p>)}
        {page.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((t, i) => <p key={i}><Rich text={t} /></p>)}
            {s.ul && <ul>{s.ul.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>}
            {s.table && (
              <div className="pg-tablewrap"><table className="pg-table">
                <thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody>
              </table></div>
            )}
            {slug === "tim" && s.h.includes("Keluhan") && <ComplaintBox />}
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
