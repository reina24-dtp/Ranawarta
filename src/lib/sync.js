// Offline drafts and pending reports stay in the browser until uploaded to Supabase.
import { delPhoto, getPhoto, putPhoto, blobToDataUrl } from "./idb";
import { DEMO_TICKETS } from "../data/demo-tickets";
import seedReports from "../data/seed-reports.json";
import { checkPhoto } from "./ai";
import { enabled, hasAdminSession, photoUrl, rpc, uploadPhoto } from "./supabase";

const DAY = 864e5;
const K = { mine: "rw:mine", drafts: "rw:drafts", ai: "rw:aiConsent", updates: "rw:pendingReportUpdates" };
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); };

export const hasAiConsent = () => rd(K.ai, false);
export const giveAiConsent = () => wr(K.ai, true);
export const listMine = () => rd(K.mine, []);
export const listDrafts = () => rd(K.drafts, []);
const A = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const pick = (n) => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join("");
const official = () => "RW-" + pick(4);
export const normCode = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "");
const photoExtension = (blob) => blob?.type === "image/png" ? "png" : blob?.type === "image/webp" ? "webp" : "jpg";

async function submitToSupabase(rec, blob, code = rec.code) {
  const path = blob ? `${rec.id}.${photoExtension(blob)}` : null;
  if (blob) await uploadPhoto(path, blob);
  await rpc("submit_report", {
    p_id: rec.id,
    p_code: code,
    p_category: rec.category,
    p_description: rec.description || "",
    p_kec: rec.kec,
    p_lat: rec.lat,
    p_lng: rec.lng,
    p_needs_review: !!rec.needs_review,
    p_photo_path: path,
    p_ai_check: rec.ai_check || null,
    p_captured_at: rec.captured_at || null
  });
  return { ...rec, code, temp: false, photo_path: path, photo_url: photoUrl(path) };
}

export async function submitReport(d) {
  if (localStorage.getItem("rw:simfail")) throw new Error("Simulasi gagal kirim.");
  const online = navigator.onLine && enabled;
  if (navigator.onLine && !enabled) throw new Error("Supabase belum dikonfigurasi. Laporan online tidak dapat dikirim.");
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const now = new Date().toISOString();
  const rec = {
    id,
    code: online ? official() : "TMP-" + pick(6),
    temp: !online,
    category: d.category,
    description: d.description,
    hasPhoto: !!d.photoBlob,
    captured_at: d.capturedAt || null,
    created_at: now,
    lat: d.lat,
    lng: d.lng,
    kec: d.kec,
    status: online ? "diterima" : "menunggu",
    history: [{ status: online ? "diterima" : "menunggu", at: now }],
    support: 0,
    needs_review: !!d.needsReview,
    ai_check: d.aiCheck || null,
    is_demo: false
  };
  if (!online) {
    if (d.photoBlob) await putPhoto(id, d.photoBlob);
    wr(K.mine, [rec, ...listMine()]);
    return rec;
  }
  return submitToSupabase(rec, d.photoBlob);
}

export const patchMine = (code, fn) => wr(K.mine, listMine().map((r) => (r.code === code ? fn(r) : r)));

export async function syncExistingMineToSupabase() {
  return flushPending();
}

let flushTask = null;
export function flushPending() {
  if (flushTask) return flushTask;
  flushTask = flushPendingWork().finally(() => { flushTask = null; });
  return flushTask;
}

async function flushPendingWork() {
  if (!navigator.onLine || !enabled) return [];
  const out = [];
  for (const r of listMine()) {
    let ai = r.ai_check;
    const blob = r.hasPhoto ? await getPhoto(r.id) : null;
    if (!ai && blob && hasAiConsent()) {
      try { ai = await checkPhoto({ dataUrl: await blobToDataUrl(blob), category: r.category }); }
      catch { /* AI is optional; the submitted report remains usable. */ }
    }
    const needsReview = !!(r.needs_review || ai?.is_valid === "tidak" || ai?.is_valid === "tidak_yakin" ||
      ai?.category_match === "tidak_yakin" || (ai?.category_match === "tidak" && ai.suggested_category !== r.category));
    const rec = { ...r, ai_check: ai, needs_review: needsReview };
    const reportCode = r.temp || r.code.startsWith("TMP-") ? official() : r.code;
    const uploaded = await submitToSupabase(rec, blob, reportCode);
    wr(K.mine, listMine().filter((x) => x.id !== r.id));
    await delPhoto(r.id);
    out.push({ from: r.code, to: uploaded.code });
  }
  const updates = rd(K.updates, []);
  for (const update of updates) {
    let patch = update.patch;
    if (patch.confirmation && !patch.confirmation.photo_path && patch.confirmation.photoKey) {
      const blob = await getPhoto(patch.confirmation.photoKey);
      if (blob) {
        const path = `confirmations/${crypto.randomUUID()}.${photoExtension(blob)}`;
        await uploadPhoto(path, blob);
        patch = { ...patch, confirmation: { ...patch.confirmation, photo_path: path } };
      }
    }
    await patchReport(update.code, patch);
    wr(K.updates, rd(K.updates, []).filter((item) => item.id !== update.id));
    if (patch.confirmation?.photoKey) await delPhoto(patch.confirmation.photoKey);
  }
  return out;
}

export async function saveDraft(d) {
  const id = "draf-" + Date.now();
  if (d.photoBlob) await putPhoto(id, d.photoBlob);
  const { photoBlob, ...rest } = d;
  wr(K.drafts, [{ ...rest, id, hasPhoto: !!photoBlob, saved_at: new Date().toISOString() }, ...listDrafts()]);
  return id;
}

export const removeDraft = async (id) => {
  wr(K.drafts, listDrafts().filter((x) => x.id !== id));
  await delPhoto(id);
};
export const draftBlob = (id) => getPhoto(id);

export async function getReport(code) {
  const c = normCode(code);
  const pendingPatch = rd(K.updates, []).filter((u) => u.code === c).reduce((out, u) => ({ ...out, ...u.patch }), {});
  const queued = listMine().find((r) => r.code === c);
  if (queued) return { ...queued, ...pendingPatch };

  if (navigator.onLine && enabled) {
    const row = await rpc("get_public_report", { p_code: c });
    if (row) {
      return {
        ...row,
        ...pendingPatch,
        support: row.support_count || 0,
        hasPhoto: !!row.photo_path,
        photo_url: photoUrl(row.photo_path),
        history: Array.isArray(row.history) ? row.history : [],
        is_demo: !!row.is_demo
      };
    }
  }

  const d = DEMO_TICKETS[c];
  if (d) {
    const now = Date.now();
    return {
      id: c, code: c, category: d.category, kec: d.kec, description: d.description,
      created_at: new Date(now - d.daysAgo * DAY).toISOString(), status: d.status,
      support: d.support, is_demo: true,
      needs_review: c === "RW-0421" || d.status === "disengketakan",
      history: d.history.map(([status, ago]) => ({ status, at: new Date(now - ago * DAY).toISOString() })),
      hasPhoto: true,
      ...pendingPatch
    };
  }

  const seed = seedReports.find((r) => ("RW-" + r.id.replace(/^R/, "1")) === c);
  if (seed) {
    const now = Date.now();
    const createdAt = new Date(now - (seed.daysAgo || 10) * DAY).toISOString();
    return {
      ...seed, code: c, description: `Laporan ${seed.category.toLowerCase()} di Kecamatan ${seed.kec}`,
      created_at: createdAt, is_demo: true,
      needs_review: seed.status === "disengketakan" || seed.id === "R002",
      history: [
        { status: "diterima", at: createdAt },
        ...(seed.status !== "diterima" ? [{ status: seed.status, at: new Date(now - 2 * DAY).toISOString() }] : [])
      ],
      hasPhoto: true,
      ...pendingPatch
    };
  }

  return null;
}

export async function patchReport(code, patch) {
  const c = normCode(code);
  if (enabled && navigator.onLine) {
    if (patch.confirmation && patch.status) {
      await rpc("confirm_report", {
        p_code: c,
        p_result: patch.confirmation.result,
        p_confirmation: patch.confirmation,
        p_needs_review: !!patch.needs_review
      });
      return;
    }
    if (patch.confirmation && !patch.status) {
      await rpc("update_confirmation_review", {
        p_code: c,
        p_confirmation: patch.confirmation,
        p_needs_review: !!patch.needs_review
      });
      return;
    }
    if (!hasAdminSession()) throw new Error("Perubahan status hanya dapat dilakukan oleh Admin.");
    await rpc("admin_update_report", { p_code: c, p_patch: patch });
    return;
  }
  if (!navigator.onLine && listMine().some((r) => r.code === c)) {
    wr(K.updates, [...rd(K.updates, []), { id: crypto.randomUUID(), code: c, patch }]);
    patchMine(c, (r) => ({ ...r, ...patch }));
    return;
  }
  if (!navigator.onLine && patch.confirmation && (patch.status === "terkonfirmasi" || patch.status === "disengketakan")) {
    wr(K.updates, [...rd(K.updates, []), { id: crypto.randomUUID(), code: c, patch }]);
    return;
  }
  throw new Error("Supabase harus tersedia untuk menyimpan perubahan laporan.");
}
