// Repository laporan. Mendukung database Supabase permanen dan penyimpanan lokal.
import seed from "../data/seed-reports.json";
import { supportReport, voteReport, hasSupported, ownCounted, fetchSupportCounts, fetchMySupportIds } from "./support";
import { enabled, photoUrl, select } from "./supabase";
import { listMine, syncExistingMineToSupabase } from "./sync";
const DAY = 864e5, KEY = "rw:interactions";

export async function listReports() {
  const now = Date.now();

  // Sinkronkan laporan lokal ke Supabase di latar belakang bila online
  if (enabled && typeof window !== "undefined" && navigator.onLine) {
    syncExistingMineToSupabase().catch((e) => console.warn("Gagal mengirim antrean laporan:", e));
  }

  // 1. Jika Supabase aktif, ambil seluruh laporan langsung dari view public_reports
  if (enabled) {
    try {
      const [rows] = await Promise.all([
        select(
          "public_reports",
          "select=id,category,description,kec,lat,lng,status,support_count,is_demo,created_at,photo_path,needs_review,history,confirmation,votes&order=created_at.desc"
        ),
        fetchMySupportIds()
      ]);
      if (Array.isArray(rows)) {
        const dbIds = new Set(rows.map((r) => r.id));
        const dbMapped = rows.map((r) => {
          const base = (r.support_count || 0) - (ownCounted(r.id) ? 1 : 0);
          return {
            id: r.id,
            category: r.category,
            description: r.description,
            kec: r.kec,
            lat: r.lat,
            lng: r.lng,
            status: r.status,
            support: Math.max(0, base),
            date: r.created_at,
            daysAgo: Math.max(0, Math.round((now - +new Date(r.created_at)) / DAY)),
            is_demo: !!r.is_demo,
            votes: r.votes || { masih: 0, diperbaiki: 0, salah: 0 },
            photo_path: r.photo_path,
            photo_url: photoUrl(r.photo_path),
            needs_review: !!r.needs_review,
            history: r.history,
            confirmation: r.confirmation
          };
        });

        // Sertakan juga laporan pengguna yang masih dalam antrean lokal
        const pendingMine = listMine()
          .filter((m) => !dbIds.has(m.id))
          .map((m) => ({
            id: m.id,
            category: m.category,
            description: m.description,
            kec: m.kec,
            lat: m.lat,
            lng: m.lng,
            status: m.status,
            support: (m.support || 0) + (hasSupported(m.id) ? 1 : 0),
            date: m.created_at,
            daysAgo: Math.max(0, Math.round((now - +new Date(m.created_at)) / DAY)),
            is_demo: false
          }));

        return [...pendingMine, ...dbMapped];
      }
    } catch (e) {
      if (navigator.onLine) throw e;
    }
  }

  // 2. Mode lokal / fallback jika Supabase belum aktif atau gagal terhubung
  const counts = await fetchSupportCounts();
  const mine = listMine().map((m) => {
    const base = counts && counts[m.id] != null ? counts[m.id] - (ownCounted(m.id) ? 1 : 0) : m.support || 0;
    return {
      id: m.id,
      category: m.category,
      description: m.description,
      kec: m.kec,
      lat: m.lat,
      lng: m.lng,
      status: m.status,
      support: Math.max(0, base),
      date: m.created_at,
      daysAgo: Math.max(0, Math.round((now - +new Date(m.created_at)) / DAY)),
      is_demo: false
    };
  });

  const seedMapped = seed.map((r) => {
    const base = counts && counts[r.id] != null ? counts[r.id] - (ownCounted(r.id) ? 1 : 0) : r.support;
    return { ...r, support: Math.max(0, base), date: new Date(now - r.daysAgo * DAY).toISOString(), is_demo: true };
  });

  return [...mine, ...seedMapped];
}

const readOffline = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const writeOffline = (o) => { if (!navigator.onLine) localStorage.setItem(KEY, JSON.stringify(o)); };
const sessionInteractions = {};

export const getInteraction = (id) => {
  const state = navigator.onLine ? sessionInteractions : readOffline();
  const o = state[id] || { support: false, vote: null };
  return { ...o, support: o.support || hasSupported(id) };
};
export async function doSupport(id) {
  const state = navigator.onLine ? sessionInteractions : readOffline();
  const result = await supportReport(id);
  state[id] = { ...(state[id] || {}), support: !result.already };
  if (!navigator.onLine) writeOffline(state);
  return result;
}
export async function doVote(id, vote) {
  const state = navigator.onLine ? sessionInteractions : readOffline();
  if (state[id]?.vote) return;
  const result = await voteReport(id, vote);
  state[id] = { ...(state[id] || {}), vote: result?.vote || vote };
  if (!navigator.onLine) writeOffline(state);
}
