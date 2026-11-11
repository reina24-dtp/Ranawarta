// Support counts and votes persist in Supabase; only offline actions are queued locally.
import { enabled, rpc, select } from "./supabase";

const K = { dev: "rw:deviceId", done: "rw:supports", queue: "rw:supportQueue", votes: "rw:voteQueue" };
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const sessionDone = new Set();
function clearOfflineInteraction(id) {
  const state = rd("rw:interactions", {});
  delete state[id];
  if (Object.keys(state).length) wr("rw:interactions", state);
  else localStorage.removeItem("rw:interactions");
}

export function deviceId() {
  let id = localStorage.getItem(K.dev);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : "d" + Date.now() + Math.random().toString(36).slice(2);
    localStorage.setItem(K.dev, id);
  }
  return id;
}

export async function fetchMySupportIds() {
  if (!enabled || !navigator.onLine) return [];
  const ids = await rpc("get_my_report_supports", { p_device_id: deviceId() });
  for (const id of ids || []) sessionDone.add(String(id));
  return ids || [];
}

export const hasSupported = (reportId) =>
  sessionDone.has(String(reportId)) || (!navigator.onLine && rd(K.done, []).includes(String(reportId)));
export const ownCounted = (reportId) =>
  hasSupported(reportId) && !rd(K.queue, []).includes(String(reportId));

async function push(reportId) {
  if (!enabled || !navigator.onLine) return null;
  const result = await rpc("support_report_once", {
    p_report_id: String(reportId),
    p_device_id: deviceId()
  });
  return result;
}

export async function supportReport(reportId) {
  const id = String(reportId);
  if (hasSupported(id)) return { count: null, already: true };
  if (navigator.onLine) {
    if (!enabled) throw new Error("Supabase belum dikonfigurasi untuk menyimpan dukungan.");
    const result = await push(id);
    if (result?.recorded) sessionDone.add(id);
    return { count: result?.count ?? null, already: !result?.recorded };
  }
  wr(K.done, [...new Set([...rd(K.done, []), id])]);
  wr(K.queue, [...new Set([...rd(K.queue, []), id])]);
  return { count: null, queued: true };
}

export async function flushSupportQueue() {
  if (!enabled || !navigator.onLine) return;
  const legacyInteractions = rd("rw:interactions", {});
  const supportIds = new Set([
    ...rd(K.queue, []),
    ...rd(K.done, []),
    ...Object.entries(legacyInteractions).filter(([, value]) => value.support).map(([id]) => id)
  ]);
  for (const id of supportIds) {
    const result = await push(id);
    if (result) {
      sessionDone.add(id);
      wr(K.queue, rd(K.queue, []).filter((x) => x !== id));
      wr(K.done, rd(K.done, []).filter((x) => x !== id));
      clearOfflineInteraction(id);
    }
  }
  const votes = new Map([
    ...Object.entries(legacyInteractions).filter(([, value]) => value.vote).map(([id, value]) => [id, value.vote]),
    ...rd(K.votes, []).map((item) => [item.id, item.vote])
  ]);
  for (const [id, vote] of votes) {
    await rpc("vote_report", { p_report_id: id, p_device_id: deviceId(), p_vote: vote });
    wr(K.votes, rd(K.votes, []).filter((entry) => entry.id !== id));
    clearOfflineInteraction(id);
  }
}

export async function voteReport(reportId, vote) {
  const id = String(reportId);
  if (navigator.onLine) {
    if (!enabled) throw new Error("Supabase belum dikonfigurasi untuk menyimpan suara.");
    return rpc("vote_report", { p_report_id: id, p_device_id: deviceId(), p_vote: vote });
  }
  const queue = rd(K.votes, []);
  if (!queue.some((entry) => entry.id === id)) wr(K.votes, [...queue, { id, vote }]);
  return { recorded: true, vote };
}

export async function fetchSupportCounts() {
  if (!enabled || !navigator.onLine) return null;
  const rows = await select("public_reports", "select=id,support_count");
  return Object.fromEntries(rows.map((r) => [r.id, r.support_count]));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushSupportQueue().catch((e) => console.warn("Gagal menyinkronkan dukungan:", e)); });
  window.addEventListener("load", () => { flushSupportQueue().catch((e) => console.warn("Gagal menyinkronkan dukungan:", e)); });
}
