// Supabase REST, Auth, and Storage client without additional dependencies.
const URL_ = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_KEY = "rw:supabase-session";

export const enabled = !!(URL_ && KEY);

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}

async function authRequest(path, body) {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.message || data.error_description || "Autentikasi Supabase gagal.");
  return data;
}

export async function signIn(email, password) {
  if (!enabled) throw new Error("Konfigurasi Supabase belum tersedia.");
  const session = await authRequest("token?grant_type=password", { email, password });
  if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  saveSession(session);
  return session;
}

export function signOut() {
  saveSession(null);
}

export function hasAdminSession() {
  return !!readSession()?.access_token;
}

async function accessToken() {
  let session = readSession();
  if (session?.refresh_token && session.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
    session = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
    if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
    saveSession(session);
  }
  return session?.access_token || KEY;
}

async function request(url, init = {}) {
  const token = await accessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const body = JSON.parse(text);
      message = body.message || body.msg || body.error_description || body.error || text;
    } catch {}
    throw new Error(`Supabase ${res.status}: ${message}`);
  }
  return text ? JSON.parse(text) : null;
}

export const rpc = (fn, args) => request(`${URL_}/rest/v1/rpc/${fn}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(args)
});

export const select = (table, query) => request(`${URL_}/rest/v1/${table}?${query}`);

export async function uploadPhoto(path, blob) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  try {
    return await request(`${URL_}/storage/v1/object/report-photos/${encoded}`, {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: blob
    });
  } catch (error) {
    if (error.message.includes("Supabase 409")) return null;
    throw error;
  }
}

export function photoUrl(path) {
  if (!path) return null;
  const encoded = String(path).split("/").map(encodeURIComponent).join("/");
  return `${URL_}/storage/v1/object/public/report-photos/${encoded}`;
}

export async function downloadPhoto(path) {
  const url = photoUrl(path);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat foto (${res.status}).`);
  return res.blob();
}
