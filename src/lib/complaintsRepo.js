// Complaints live in Supabase; the browser stores only offline submissions and mutations.
import { enabled, hasAdminSession, rpc } from "./supabase";

const QUEUE_KEY = "rw:complaintQueue";
const readQueue = () => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
};
const writeQueue = (queue) => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
const mapRow = (r) => ({
  id: r.id,
  type: r.type,
  ticketCode: r.ticket_code || "",
  sender: r.sender || "Warga Sidoarjo",
  contact: r.contact || "",
  message: r.message || "",
  status: r.status || "Belum Ditinjau",
  createdAt: r.created_at
});

export function listComplaints() {
  if (navigator.onLine) return [];
  let items = readQueue().filter((entry) => entry.kind === "submit").map((entry) => ({ ...entry.item, queued: true }));
  readQueue().filter((entry) => entry.kind !== "submit").forEach((entry) => {
    if (entry.kind === "update") items = items.map((item) => item.id === entry.id ? { ...item, status: entry.status } : item);
    if (entry.kind === "delete") items = items.filter((item) => item.id !== entry.id);
  });
  return items;
}

export async function fetchComplaintsFromDb() {
  if (!enabled || !navigator.onLine) return listComplaints();
  if (!hasAdminSession()) return [];
  const rows = await rpc("admin_get_complaints", {});
  return rows.map(mapRow);
}

export async function addComplaint({ type, ticketCode, sender, contact, message }) {
  const item = {
    id: "C-" + crypto.randomUUID(),
    type: type || "Keluhan",
    ticketCode: String(ticketCode || "").trim().toUpperCase(),
    sender: String(sender || "").trim() || "Warga Sidoarjo",
    contact: String(contact || "").trim(),
    message: String(message || "").trim(),
    createdAt: new Date().toISOString(),
    status: "Belum Ditinjau"
  };
  if (navigator.onLine && !enabled) throw new Error("Supabase belum dikonfigurasi untuk menerima keluhan.");
  if (enabled && navigator.onLine) {
    await rpc("submit_complaint", {
      p_id: item.id,
      p_type: item.type,
      p_ticket_code: item.ticketCode || null,
      p_sender: item.sender,
      p_contact: item.contact,
      p_message: item.message
    });
    return item;
  }
  writeQueue([...readQueue(), { kind: "submit", item }]);
  return { ...item, queued: true };
}

export async function updateComplaintStatus(id, newStatus) {
  if (navigator.onLine && !enabled) throw new Error("Supabase belum dikonfigurasi untuk mengubah status keluhan.");
  if (!navigator.onLine) {
    writeQueue([...readQueue(), { kind: "update", id, status: newStatus }]);
    return listComplaints();
  }
  await rpc("update_complaint_status", { p_id: id, p_status: newStatus });
  return fetchComplaintsFromDb();
}

export async function deleteComplaint(id) {
  if (navigator.onLine && !enabled) throw new Error("Supabase belum dikonfigurasi untuk menghapus keluhan.");
  if (!navigator.onLine) {
    writeQueue([...readQueue(), { kind: "delete", id }]);
    return listComplaints();
  }
  await rpc("delete_complaint", { p_id: id });
  return fetchComplaintsFromDb();
}

export async function flushComplaintQueue() {
  if (!enabled || !navigator.onLine) return;
  while (readQueue().length) {
    const queue = readQueue();
    const entry = queue[0];
    if (entry.kind === "submit") {
      const c = entry.item;
      await rpc("submit_complaint", {
        p_id: c.id, p_type: c.type, p_ticket_code: c.ticketCode || null,
        p_sender: c.sender, p_contact: c.contact, p_message: c.message
      });
    } else {
      if (!hasAdminSession()) return;
      if (entry.kind === "update") await rpc("update_complaint_status", { p_id: entry.id, p_status: entry.status });
      if (entry.kind === "delete") await rpc("delete_complaint", { p_id: entry.id });
    }
    writeQueue(readQueue().slice(1));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushComplaintQueue().catch((e) => console.warn("Gagal menyinkronkan antrean keluhan:", e)); });
}
