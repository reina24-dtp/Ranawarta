// Admin reports and moderation are persisted in Supabase; only offline submissions stay local.
import seedReports from "../data/seed-reports.json";
import { listMine } from "./sync.js";
import { samplePhoto } from "./samplePhoto.js";
import { enabled, hasAdminSession, photoUrl, rpc } from "./supabase.js";
import info from "../data/kecamatan-info.json";

const DAY = 864e5;
const KEC_MAP = Object.fromEntries(info.map((k) => [k.id, k.name]));
export const QUIET_KECAMATAN = ["jabon", "sedati", "balongbendo"];

const mapReport = (r) => ({
  ...r,
  code: r.code || ("RW-" + String(r.id).replace(/^R/, "1")),
  kecName: KEC_MAP[r.kec] || r.kec,
  support: r.support_count || 0,
  created_at: r.created_at,
  daysAgo: Math.max(0, Math.round((Date.now() - +new Date(r.created_at)) / DAY)),
  photoUrl: photoUrl(r.photo_path) || samplePhoto(r.category),
  photoFlagged: !!r.photo_flagged,
  moderation_status: r.moderation_status || (r.needs_review ? "Perlu Moderasi" : "Lolos Moderasi"),
  moderation_note: r.moderation_note || "",
  dispute_note: r.dispute_note || "",
  history: Array.isArray(r.history) ? r.history : [],
  confirmationPhotoUrl: photoUrl(r.confirmation?.photo_path),
  deleted: !!r.is_deleted,
  is_demo: !!r.is_demo
});

async function loadAdminReports() {
  if (enabled && navigator.onLine) {
    if (!hasAdminSession()) throw new Error("Silakan masuk dengan akun Admin Supabase.");
    const rows = await rpc("admin_get_reports", {});
    return [...rows.map(mapReport), ...listMine().filter((r) => r.temp).map(mapReport)];
  }

  const now = Date.now();
  return [
    ...listMine().map(mapReport),
    ...seedReports.map((r) => mapReport({
      ...r,
      code: "RW-" + r.id.replace(/^R/, "1"),
      created_at: new Date(now - (r.daysAgo || 10) * DAY).toISOString(),
      is_demo: true
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getAllAdminReports() {
  return (await loadAdminReports()).filter((r) => !r.deleted);
}

async function updateReport(code, patch) {
  if (!enabled || !navigator.onLine || !hasAdminSession()) {
    throw new Error("Perubahan Admin memerlukan koneksi dan sesi Admin Supabase aktif.");
  }
  await rpc("admin_update_report", { p_code: code, p_patch: patch });
  return getAllAdminReports();
}

export async function updateReportStatus(code, newStatus, note = "") {
  const currentReports = await getAllAdminReports();
  const report = currentReports.find((r) => r.code === code);
  if (!report) throw new Error("Laporan tidak ditemukan.");
  const at = new Date().toISOString();
  const history = [...(report.history || []), {
    status: newStatus,
    at,
    note: note.trim() || `Diubah oleh admin menjadi ${newStatus}`
  }];
  const disputed = newStatus === "disengketakan";
  return updateReport(code, {
    status: newStatus,
    history,
    needs_review: disputed,
    moderation_status: disputed ? "Perlu Tinjauan Sengketa" : report.moderation_status
  });
}

export async function resolveDispute(code, decision, note = "") {
  if (decision === "rework") {
    return updateReportStatus(code, "dikerjakan", note || "Diverifikasi belum selesai; dikembalikan untuk perbaikan lanjutan.");
  }
  if (decision === "confirm_done") {
    return updateReportStatus(code, "terkonfirmasi", note || "Sengketa diselesaikan admin: pekerjaan terkonfirmasi selesai.");
  }
  if (decision === "keep_dispute") {
    return updateReport(code, { dispute_note: note, needs_review: true });
  }
  if (decision === "clear_flag") {
    return updateReport(code, { needs_review: false, moderation_status: "Sengketa Selesai Ditinjau" });
  }
  throw new Error("Keputusan sengketa tidak dikenali.");
}

export async function moderateReport(code, action, note = "") {
  const at = new Date().toISOString();
  if (action === "approve") {
    return updateReport(code, {
      needs_review: false,
      moderated_at: at,
      moderation_status: "Disetujui (Lolos Moderasi)",
      moderation_note: note
    });
  }
  if (action === "reject_spam") return deleteReport(code);
  if (action === "flag_photo") {
    return updateReport(code, {
      photoFlagged: true,
      moderated_at: at,
      moderation_status: "Foto Tidak Relevan (Disensor)",
      moderation_note: note || "Foto dilaporkan tidak sesuai dengan masalah fasilitas publik."
    });
  }
  if (action === "unflag_photo") {
    return updateReport(code, { photoFlagged: false, moderation_status: "Lolos Moderasi", moderation_note: "" });
  }
  if (action === "flag_review") {
    return updateReport(code, {
      needs_review: true,
      moderated_at: at,
      moderation_status: "Perlu Tinjauan Khusus",
      moderation_note: note
    });
  }
  throw new Error("Aksi moderasi tidak dikenali.");
}

export const deleteReport = (code) => updateReport(code, { is_deleted: true });
export const restoreReport = (code) => updateReport(code, { is_deleted: false });

export async function getDeletedReports() {
  return (await loadAdminReports()).filter((r) => r.deleted);
}

export function getAdminStats(reports = [], complaints = []) {
  const activeReports = reports.filter((r) => !r.deleted);
  const statusCounts = {
    diterima: 0,
    diverifikasi: 0,
    dikerjakan: 0,
    selesai_dinas: 0,
    terkonfirmasi: 0,
    disengketakan: 0
  };
  const categoryCounts = {};
  const kecCounts = {};
  let disputedCount = 0;
  let flaggedPhotosCount = 0;
  let quietZoneReports = 0;

  activeReports.forEach((r) => {
    if (statusCounts[r.status] != null) statusCounts[r.status]++;
    if (r.status === "disengketakan" || r.needs_review) disputedCount++;
    if (r.photoFlagged) flaggedPhotosCount++;
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    kecCounts[r.kec] = (kecCounts[r.kec] || 0) + 1;
    if (QUIET_KECAMATAN.includes(r.kec)) quietZoneReports++;
  });

  const totalReports = activeReports.length;
  const resolved = statusCounts.selesai_dinas + statusCounts.terkonfirmasi;
  const pendingComplaints = complaints.filter((c) => c.status !== "Selesai").length;
  return {
    totalReports,
    statusCounts,
    disputedCount,
    flaggedPhotosCount,
    quietZoneReports,
    completionRate: totalReports ? Math.round((resolved / totalReports) * 100) : 0,
    categoryCounts,
    kecCounts,
    totalComplaints: complaints.length,
    pendingComplaints,
    deleteRequests: complaints.filter((c) => c.type === "Permintaan Penghapusan Data Laporan").length,
    deletedReportsCount: reports.filter((r) => r.deleted).length
  };
}

export function exportReportsCSV(reports) {
  const headers = [
    "Kode Tiket", "Kategori", "Kecamatan", "Status", "Jumlah Dukungan", "Tanggal Dibuat",
    "Perlu Review Sengketa", "Status Moderasi", "Foto Disensor", "Latitude", "Longitude"
  ];
  const rows = reports.map((r) => [
    r.code,
    `"${(r.category || "").replace(/"/g, '""')}"`,
    `"${(r.kecName || "").replace(/"/g, '""')}"`,
    r.status,
    r.support || 0,
    r.created_at,
    r.needs_review ? "YA" : "TIDAK",
    `"${r.moderation_status || "Lolos Moderasi"}"`,
    r.photoFlagged ? "YA" : "TIDAK",
    r.lat,
    r.lng
  ]);
  const blob = new Blob(["\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-ranawarta-admin-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportComplaintsCSV(complaints) {
  const headers = ["ID", "Jenis Pesan", "Kode Tiket", "Pengirim", "Kontak", "Tanggal Masuk", "Status", "Isi Pesan"];
  const rows = complaints.map((c) => [
    c.id, `"${(c.type || "").replace(/"/g, '""')}"`, c.ticketCode || "-",
    `"${(c.sender || "").replace(/"/g, '""')}"`, `"${(c.contact || "").replace(/"/g, '""')}"`,
    c.createdAt, c.status, `"${(c.message || "").replace(/"/g, '""')}"`
  ]);
  const blob = new Blob(["\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `keluhan-warga-ranawarta-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportReportsJSON(reports) {
  const blob = new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-ranawarta-admin-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
