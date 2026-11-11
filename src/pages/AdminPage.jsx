import { useState, useEffect, useMemo } from "react";
import {
  getAllAdminReports,
  updateReportStatus,
  resolveDispute,
  moderateReport,
  deleteReport,
  getAdminStats,
  exportReportsCSV,
  exportReportsJSON,
  exportComplaintsCSV,
  QUIET_KECAMATAN
} from "../lib/adminRepo";
import {
  updateComplaintStatus,
  deleteComplaint,
  fetchComplaintsFromDb,
  flushComplaintQueue
} from "../lib/complaintsRepo";
import { STATUS, STATUS_ORDER, CATEGORIES } from "../data/status";
import StatusShape from "../components/StatusShape";
import AdminMap from "../components/AdminMap";
import { samplePhoto } from "../lib/samplePhoto";
import info from "../data/kecamatan-info.json";
import "../admin.css";
import { hasAdminSession, signIn, signOut } from "../lib/supabase";

const KEC_LIST = info.map((k) => ({ id: k.id, name: k.name }));
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

// Komponen Ikon SVG Profesional (Tanpa Emoji)
function Icon({ name, size = 16, className = "", style = {} }) {
  const icons = {
    refresh: (
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0 0V3m0 5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16m0 0v5m0-5h-5" />
    ),
    chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
    reports: (
      <>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <path d="M9 12h6M9 16h4" />
      </>
    ),
    alert: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    map: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
    inbox: (
      <>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </>
    ),
    export: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
    json: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
    print: (
      <>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ),
    externalLink: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    quietZone: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    )
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      {icons[name] || null}
    </svg>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState("ringkasan"); // 'ringkasan' | 'laporan' | 'sengketa' | 'moderasi' | 'peta' | 'keluhan' | 'ekspor'
  const [reports, setReports] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [authReady, setAuthReady] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [kecFilter, setKecFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [complaintFilter, setComplaintFilter] = useState("");

  // Modal State
  const [statusModalReport, setStatusModalReport] = useState(null);
  const [targetStatus, setTargetStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const [detailModalReport, setDetailModalReport] = useState(null);
  const [moderationPhotoModal, setModerationPhotoModal] = useState(null);

  // Load Data
  const refreshAll = async () => {
    if (!hasAdminSession()) {
      setReports([]);
      setComplaints([]);
      return;
    }
    setActionError("");
    try {
      await flushComplaintQueue();
      const [reportRows, complaintRows] = await Promise.all([
        getAllAdminReports(),
        fetchComplaintsFromDb()
      ]);
      setReports(reportRows);
      setComplaints(complaintRows);
      return true;
    } catch (error) {
      setActionError(error.message || "Gagal memuat data Admin dari Supabase.");
      return false;
    }
  };

  useEffect(() => {
    setAuthReady(true);
    if (hasAdminSession()) refreshAll();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      await signIn(adminEmail, adminPassword);
      setAdminPassword("");
      if (!(await refreshAll())) {
        signOut();
        setAuthError("Akun berhasil diverifikasi, tetapi belum memiliki role Admin di Supabase.");
      }
    } catch (error) {
      setAuthError(error.message || "Gagal masuk ke akun Admin.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLogout = () => {
    signOut();
    setReports([]);
    setComplaints([]);
  };

  const runComplaintAction = async (action) => {
    try {
      await action();
      await refreshAll();
    } catch (error) {
      setActionError(error.message || "Gagal menyimpan perubahan keluhan.");
    }
  };

  const stats = useMemo(() => getAdminStats(reports, complaints), [reports, complaints]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.kecName && r.kecName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q));

      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchKec = !kecFilter || r.kec === kecFilter;
      const matchCat = !catFilter || r.category === catFilter;

      return matchSearch && matchStatus && matchKec && matchCat;
    });
  }, [reports, search, statusFilter, kecFilter, catFilter]);

  // Disputed Reports
  const disputedReports = useMemo(() => {
    return reports.filter((r) => r.status === "disengketakan" || r.needs_review);
  }, [reports]);

  // Filtered Complaints
  const filteredComplaints = useMemo(() => {
    if (!complaintFilter) return complaints;
    return complaints.filter((c) => c.type === complaintFilter || c.status === complaintFilter);
  }, [complaints, complaintFilter]);

  // Handle Ubah Status
  const handleOpenStatusModal = (report) => {
    setStatusModalReport(report);
    setTargetStatus(report.status);
    setStatusNote("");
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusModalReport || !targetStatus) return;
    try {
      setReports(await updateReportStatus(statusModalReport.code, targetStatus, statusNote));
      setStatusModalReport(null);
    } catch (error) {
      setActionError(error.message || "Gagal memperbarui status laporan.");
    }
  };

  // Handle Sengketa
  const handleResolveDispute = async (code, decision, note = "") => {
    try {
      setReports(await resolveDispute(code, decision, note));
    } catch (error) {
      setActionError(error.message || "Gagal memperbarui sengketa.");
    }
  };

  // Handle Moderasi
  const handleModerate = async (code, action, note = "") => {
    try {
      setReports(await moderateReport(code, action, note));
    } catch (error) {
      setActionError(error.message || "Gagal menyimpan tindakan moderasi.");
    }
  };

  // Handle Hapus Laporan Langsung
  const handleDeleteReport = async (code) => {
    if (window.confirm(`Yakin ingin menghapus laporan ${code}? Laporan tidak akan ditampilkan lagi ke publik.`)) {
      try {
        setReports(await deleteReport(code));
      } catch (error) {
        setActionError(error.message || "Gagal menghapus laporan.");
      }
    }
  };

  // Handle Permintaan Hapus Data dari Keluhan Warga
  const handleFulfillDeleteRequest = async (complaint) => {
    const code = complaint.ticketCode;
    if (!code) {
      alert("Keluhan ini tidak memiliki kode tiket yang dapat dihapus.");
      return;
    }
    if (window.confirm(`Setujui permintaan warga untuk menghapus data laporan ${code}? Laporan akan dihapus dari sistem publik.`)) {
      try {
        await deleteReport(code);
        await updateComplaintStatus(complaint.id, "Selesai (Data Dihapus)");
        await refreshAll();
      } catch (error) {
        setActionError(error.message || "Gagal memproses permintaan penghapusan.");
      }
    }
  };

  if (!authReady) return <div className="adm-page"><p className="adm-card">Memeriksa sesi Admin…</p></div>;
  if (!hasAdminSession()) {
    return (
      <div className="adm-page adm-login-shell">
        <form className="adm-card adm-login-card" onSubmit={handleAdminLogin}>
          <img className="adm-login-logo" src="/logo.png" alt="Ranawarta" />
          <h1>Masuk Admin</h1>
          <p className="adm-login-intro">Portal Administrator Ranawarta</p>
          {authError && <p className="pg-warn" role="alert">{authError}</p>}
          <label className="adm-login-field">Email
            <input className="adm-login-input" type="email" autoComplete="username" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </label>
          <label className="adm-login-field">Kata sandi
            <input className="adm-login-input" type="password" autoComplete="current-password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
          </label>
          <button className="adm-btn-sm adm-btn-primary adm-login-submit" type="submit" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="adm-page">
      {/* Header Admin Terisolasi (Tanpa Tautan ke Website Resmi) */}
      <header className="adm-header">
        <div className="adm-header-top">
          <div className="adm-brand">
            <div style={{ display: "grid", placeItems: "center" }}>
              <img src="/logo.png" alt="Ranawarta" style={{ height: "36px" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1>Portal Administrator Ranawarta</h1>
                <span className="adm-brand-badge">SISTEM RESMI</span>
              </div>
              <small style={{ color: "#64748B", fontSize: "12px" }}>
                Pusat Pengawasan dan Moderasi Laporan Fasilitas Publik
              </small>
            </div>
          </div>

          <div className="adm-header-actions">
            <button
              className="adm-btn-sm adm-btn-outline"
              onClick={() => refreshAll()}
              title="Perbarui Data"
            >
              <Icon name="refresh" size={14} /> Refresh Data
            </button>
            <span
              style={{
                fontSize: "12px",
                color: "#0F766E",
                background: "#E6FFFA",
                border: "1px solid #99F6E4",
                padding: "6px 12px",
                borderRadius: "6px",
                fontWeight: "600"
              }}
            >
              Sesi Admin Aktif
            </span>
            <button className="adm-btn-sm adm-btn-outline" onClick={handleAdminLogout}>Keluar</button>
          </div>
        </div>
        {actionError && <p className="pg-warn" role="alert" style={{ margin: "12px 20px" }}>{actionError}</p>}

        {/* Tab Navigasi Admin dengan Ikon Profesional */}
        <nav className="adm-tabs" aria-label="Menu Admin">
          <button
            className={`adm-tab-btn ${tab === "ringkasan" ? "active" : ""}`}
            onClick={() => setTab("ringkasan")}
          >
            <Icon name="chart" size={16} /> Ringkasan
          </button>
          <button
            className={`adm-tab-btn ${tab === "laporan" ? "active" : ""}`}
            onClick={() => setTab("laporan")}
          >
            <Icon name="reports" size={16} /> Kelola Laporan ({reports.length})
          </button>
          <button
            className={`adm-tab-btn ${tab === "sengketa" ? "active" : ""}`}
            onClick={() => setTab("sengketa")}
          >
            <Icon name="alert" size={16} /> Tinjau Sengketa
            {stats.disputedCount > 0 && (
              <span className="adm-badge adm-badge-red">{stats.disputedCount}</span>
            )}
          </button>
          <button
            className={`adm-tab-btn ${tab === "moderasi" ? "active" : ""}`}
            onClick={() => setTab("moderasi")}
          >
            <Icon name="shield" size={16} /> Moderasi Konten
            {stats.flaggedPhotosCount > 0 && (
              <span className="adm-badge adm-badge-red">{stats.flaggedPhotosCount}</span>
            )}
          </button>
          <button
            className={`adm-tab-btn ${tab === "peta" ? "active" : ""}`}
            onClick={() => setTab("peta")}
          >
            <Icon name="map" size={16} /> Peta Wilayah
          </button>
          <button
            className={`adm-tab-btn ${tab === "keluhan" ? "active" : ""}`}
            onClick={() => setTab("keluhan")}
          >
            <Icon name="inbox" size={16} /> Kotak Keluhan
            {stats.pendingComplaints > 0 && (
              <span className="adm-badge adm-badge-blue">{stats.pendingComplaints}</span>
            )}
          </button>
          <button
            className={`adm-tab-btn ${tab === "ekspor" ? "active" : ""}`}
            onClick={() => setTab("ekspor")}
          >
            <Icon name="export" size={16} /> Ekspor Data
          </button>
        </nav>
      </header>

      <main className="adm-container">
        {/* Banner Alert bila ada Sengketa atau Permohonan Hapus Data */}
        {(stats.disputedCount > 0 || stats.deleteRequests > 0) && (
          <div className="adm-alert adm-alert-warn adm-hide-print">
            <Icon name="alert" size={20} style={{ color: "#B45309", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <b>Pemberitahuan Sistem:</b> Terdapat{" "}
              {stats.disputedCount > 0 && (
                <span>
                  <b>{stats.disputedCount} laporan disengketakan</b> oleh warga yang membutuhkan evaluasi.&nbsp;
                </span>
              )}
              {stats.deleteRequests > 0 && (
                <span>
                  Serta <b>{stats.deleteRequests} permintaan penghapusan data laporan</b> yang menunggu tindakan.
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {stats.disputedCount > 0 && (
                <button
                  className="adm-btn-sm adm-btn-danger"
                  onClick={() => setTab("sengketa")}
                >
                  <Icon name="alert" size={14} /> Tinjau Sengketa
                </button>
              )}
              {stats.deleteRequests > 0 && (
                <button
                  className="adm-btn-sm adm-btn-primary"
                  onClick={() => setTab("keluhan")}
                >
                  <Icon name="inbox" size={14} /> Buka Keluhan Warga
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: RINGKASAN (DASHBOARD) */}
        {/* ============================================================== */}
        {tab === "ringkasan" && (
          <div>
            {/* KPI Cards */}
            <div className="adm-stats-grid">
              <div className="adm-stat-box">
                <span className="adm-stat-label">Total Laporan</span>
                <p className="adm-stat-num">{stats.totalReports}</p>
                <span className="adm-stat-sub">Tersebar di 18 kecamatan</span>
              </div>
              <div className="adm-stat-box">
                <span className="adm-stat-label">Menunggu / Diterima</span>
                <p className="adm-stat-num" style={{ color: "#475569" }}>
                  {(stats.statusCounts.diterima || 0) + (stats.statusCounts.diverifikasi || 0)}
                </p>
                <span className="adm-stat-sub">Tahap awal verifikasi</span>
              </div>
              <div className="adm-stat-box">
                <span className="adm-stat-label">Sedang Dikerjakan</span>
                <p className="adm-stat-num" style={{ color: "#B45309" }}>
                  {stats.statusCounts.dikerjakan || 0}
                </p>
                <span className="adm-stat-sub">Dalam perbaikan fisik</span>
              </div>
              <div className="adm-stat-box">
                <span className="adm-stat-label">Selesai (Petugas/Warga)</span>
                <p className="adm-stat-num" style={{ color: "#0F766E" }}>
                  {(stats.statusCounts.selesai_dinas || 0) + (stats.statusCounts.terkonfirmasi || 0)}
                </p>
                <span className="adm-stat-sub">Tingkat tuntas: {stats.completionRate}%</span>
              </div>
              <div className="adm-stat-box" style={{ borderColor: "#FECACA", background: "#FFF5F5" }}>
                <span className="adm-stat-label" style={{ color: "#DC2626" }}>Disengketakan</span>
                <p className="adm-stat-num" style={{ color: "#DC2626" }}>
                  {stats.disputedCount}
                </p>
                <span className="adm-stat-sub">Warga verifikasi belum tuntas</span>
              </div>
              <div className="adm-stat-box">
                <span className="adm-stat-label">Kotak Keluhan Warga</span>
                <p className="adm-stat-num" style={{ color: "#2563EB" }}>
                  {stats.totalComplaints}
                </p>
                <span className="adm-stat-sub">{stats.pendingComplaints} belum selesai ditinjau</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "22px" }}>
              {/* Distribusi Kategori */}
              <div className="adm-card">
                <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Distribusi Berdasarkan Kategori</h3>
                {CATEGORIES.map((cat) => {
                  const count = stats.categoryCounts[cat] || 0;
                  const pct = stats.totalReports ? Math.round((count / stats.totalReports) * 100) : 0;
                  return (
                    <div key={cat} className="adm-bar-row">
                      <span className="adm-bar-name" title={cat}>{cat}</span>
                      <div className="adm-bar-track">
                        <div
                          className="adm-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background:
                              cat.includes("Jalan")
                                ? "#246BFD"
                                : cat.includes("Lampu")
                                ? "#F59E0B"
                                : cat.includes("Sampah")
                                ? "#10B981"
                                : cat.includes("Saluran")
                                ? "#06B6D4"
                                : "#8B5CF6"
                          }}
                        />
                      </div>
                      <span className="adm-bar-val">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>

              {/* Status & Wilayah Sunyi Spotlight */}
              <div className="adm-card">
                <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Status Operasional & Wilayah Sunyi</h3>
                
                <div style={{ background: "#F0FDFA", border: "1.5px solid #99F6E4", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Icon name="quietZone" size={16} style={{ color: "#0F766E" }} />
                      <b style={{ color: "#0F766E", fontSize: "13.5px" }}>Sorotan Wilayah Sunyi</b>
                    </div>
                    <span style={{ fontSize: "12px", background: "#0F766E", color: "#fff", padding: "2px 8px", borderRadius: "99px" }}>
                      {stats.quietZoneReports} Laporan Masuk
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "#134E4A", lineHeight: 1.5 }}>
                    Kecamatan berpenduduk paling lengang (<b>Jabon, Sedati, Balongbendo</b>) dipantau secara khusus agar laporan tidak terabaikan meskipun volume populasinya lebih rendah.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {STATUS_ORDER.map((s) => (
                    <div
                      key={s}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >
                      <StatusShape status={s} size={20} />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                          {STATUS[s].label}
                        </div>
                        <b style={{ fontSize: "15px", color: "#1E293B" }}>
                          {stats.statusCounts[s] || 0}
                        </b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aksi Cepat Admin */}
            <div className="adm-card" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <b style={{ fontSize: "15px" }}>Aksi Cepat Manajemen:</b>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                  Tinjau sengketa aktif, buka peta pemantauan, atau proses keluhan warga.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="adm-btn-sm adm-btn-danger" onClick={() => setTab("sengketa")}>
                  <Icon name="alert" size={14} /> Sengketa ({stats.disputedCount})
                </button>
                <button className="adm-btn-sm adm-btn-teal" onClick={() => setTab("peta")}>
                  <Icon name="map" size={14} /> Peta Wilayah
                </button>
                <button className="adm-btn-sm adm-btn-primary" onClick={() => setTab("keluhan")}>
                  <Icon name="inbox" size={14} /> Kotak Keluhan ({stats.pendingComplaints})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: KELOLA LAPORAN (UBAH STATUS & TABEL) */}
        {/* ============================================================== */}
        {tab === "laporan" && (
          <div className="adm-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
              <div>
                <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>Manajemen & Perubahan Status Laporan</h2>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Kelola status tahapan laporan warga dan sertakan catatan resmi penanganan petugas.
                </p>
              </div>
              <button
                className="adm-btn-sm adm-btn-teal"
                onClick={() => exportReportsCSV(filteredReports)}
              >
                <Icon name="export" size={14} /> Unduh CSV ({filteredReports.length})
              </button>
            </div>

            {/* Bar Filter */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <input
                type="text"
                className="pg-input"
                style={{ flex: "1 1 200px", margin: 0, padding: "8px 12px" }}
                placeholder="Cari kode tiket, kategori, atau kecamatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="pg-input"
                style={{ width: "auto", margin: 0, padding: "8px 12px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS[s].label}</option>
                ))}
              </select>

              <select
                className="pg-input"
                style={{ width: "auto", margin: 0, padding: "8px 12px" }}
                value={kecFilter}
                onChange={(e) => setKecFilter(e.target.value)}
              >
                <option value="">Semua Kecamatan (18)</option>
                {KEC_LIST.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>

              <select
                className="pg-input"
                style={{ width: "auto", margin: 0, padding: "8px 12px" }}
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">Semua Kategori</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {(search || statusFilter || kecFilter || catFilter) && (
                <button
                  className="adm-btn-sm adm-btn-outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setKecFilter("");
                    setCatFilter("");
                  }}
                >
                  <Icon name="close" size={13} /> Reset Filter
                </button>
              )}
            </div>

            {/* Tabel Laporan */}
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Kode Tiket</th>
                    <th>Foto</th>
                    <th>Kategori & Keterangan</th>
                    <th>Kecamatan</th>
                    <th>Status Saat Ini</th>
                    <th>Dukungan</th>
                    <th>Tanggal</th>
                    <th style={{ textAlign: "right" }}>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#64748B" }}>
                        Tidak ada laporan yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((r) => {
                      const isDisputed = r.status === "disengketakan" || r.needs_review;
                      return (
                        <tr key={r.code} style={{ background: isDisputed ? "#FFFDF5" : undefined }}>
                          <td>
                            <b style={{ color: "#16324F" }}>{r.code}</b>
                            {r.is_demo && <span style={{ display: "block", fontSize: "10px", color: "#64748B" }}>DATA CONTOH</span>}
                            {isDisputed && (
                              <span style={{ display: "inline-block", background: "#FEE2E2", color: "#991B1B", fontSize: "10px", fontWeight: "700", padding: "1px 5px", borderRadius: "4px", marginTop: "2px" }}>
                                PERLU TINJAU
                              </span>
                            )}
                          </td>
                          <td>
                            {r.photoFlagged ? (
                              <div
                                style={{
                                  width: 50,
                                  height: 38,
                                  background: "#FEE2E2",
                                  color: "#991B1B",
                                  fontSize: "9px",
                                  fontWeight: "700",
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: "6px",
                                  textAlign: "center"
                                }}
                                title="Foto disensor karena tidak relevan"
                              >
                                DISENSOR
                              </div>
                            ) : (
                              <img
                                src={r.photoUrl || samplePhoto(r.category, 60, 45)}
                                alt=""
                                className="adm-table-thumb"
                                onClick={() => setModerationPhotoModal(r)}
                                title="Klik untuk melihat foto"
                                style={{ cursor: "pointer" }}
                              />
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: "600", color: "#16324F" }}>{r.category}</div>
                            <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.description || "-"}
                            </div>
                          </td>
                          <td>
                            <span>{r.kecName || r.kec}</span>
                            {QUIET_KECAMATAN.includes(r.kec) && (
                              <span style={{ display: "block", fontSize: "10px", color: "#0F766E", fontWeight: "700" }}>
                                WILAYAH SUNYI
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="pg-chip" style={{ fontSize: "12px", padding: "2px 8px" }}>
                              <StatusShape status={r.status} size={14} />
                              {STATUS[r.status]?.label || r.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: "700", color: "#087878" }}>
                              {r.support || 0}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "#64748B" }}>
                            {fmtDate(r.created_at)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                className="adm-btn-sm adm-btn-primary"
                                onClick={() => handleOpenStatusModal(r)}
                              >
                                Ubah Status
                              </button>
                              <button
                                className="adm-btn-sm adm-btn-outline"
                                onClick={() => setDetailModalReport(r)}
                              >
                                Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TINJAU SENGKETA (LAPORAN DISENGKETAKAN) */}
        {/* ============================================================== */}
        {tab === "sengketa" && (
          <div>
            <div className="adm-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>
                    Tinjauan Laporan Disengketakan ({disputedReports.length})
                  </h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                    Terjadi saat petugas menandai status selesai, namun warga menyatakan belum tuntas saat verifikasi lapangan dengan foto kamera.
                  </p>
                </div>
              </div>

              {disputedReports.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", background: "#F8FAFC", borderRadius: "12px" }}>
                  <Icon name="checkCircle" size={36} style={{ color: "#10B981", display: "block", margin: "0 auto 10px" }} />
                  <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>Tidak Ada Laporan yang Disengketakan</h3>
                  <p style={{ margin: 0, color: "#64748B", fontSize: "13.5px" }}>
                    Seluruh laporan berada dalam status penanganan reguler tanpa perbedaan verifikasi fisik.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "18px" }}>
                  {disputedReports.map((r) => (
                    <div
                      key={r.code}
                      style={{
                        border: "1.5px solid #FCA5A5",
                        borderRadius: "14px",
                        padding: "20px",
                        background: "#FFFBFB"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ background: "#DC2626", color: "#fff", fontWeight: "700", fontSize: "12px", padding: "3px 10px", borderRadius: "6px" }}>
                              {r.code}
                            </span>
                            <h3 style={{ margin: 0, fontSize: "16px" }}>{r.category}</h3>
                            <span className="pg-chip" style={{ fontSize: "12px" }}>
                              <StatusShape status={r.status} size={14} />
                              {STATUS[r.status]?.label || r.status}
                            </span>
                          </div>
                          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748B" }}>
                            Lokasi: <b>Kecamatan {r.kecName || r.kec}</b> · Tanggal Laporan: {fmtDate(r.created_at)}
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            className="adm-btn-sm adm-btn-danger"
                            onClick={() => handleResolveDispute(r.code, "rework")}
                          >
                            <Icon name="refresh" size={13} /> Kembalikan ke Dikerjakan
                          </button>
                          <button
                            className="adm-btn-sm adm-btn-teal"
                            onClick={() => handleResolveDispute(r.code, "confirm_done")}
                          >
                            <Icon name="check" size={13} /> Tetapkan Terkonfirmasi
                          </button>
                          <button
                            className="adm-btn-sm adm-btn-outline"
                            onClick={() => handleResolveDispute(r.code, "clear_flag")}
                          >
                            Tandai Ditinjau
                          </button>
                        </div>
                      </div>

                      {/* Detail Sengketa & Perbandingan Foto */}
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #E2E8F0",
                          borderRadius: "10px",
                          padding: "16px",
                          marginBottom: "14px"
                        }}
                      >
                        <b style={{ display: "block", color: "#991B1B", marginBottom: "8px", fontSize: "13.5px" }}>
                          Alasan Sengketa / Temuan Verifikasi Warga:
                        </b>
                        <p style={{ margin: "0 0 12px", fontSize: "13.5px", color: "#334155", lineHeight: 1.5 }}>
                          {r.dispute_reason || "Warga pelapor memotret lokasi dan mengonfirmasi bahwa masalah belum tertangani sepenuhnya di lapangan."}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                          <div>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", display: "block", marginBottom: "4px" }}>
                              Foto Laporan Awal
                            </span>
                            <img
                              src={r.photoUrl || samplePhoto(r.category, 300, 180)}
                              alt="Laporan Awal"
                              style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                            />
                          </div>

                          <div>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", display: "block", marginBottom: "4px" }}>
                              Foto Konfirmasi Warga
                            </span>
                            <img
                              src={r.confirmationPhotoUrl || samplePhoto(r.category, 300, 180)}
                              alt="Konfirmasi Warga"
                              style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Riwayat Status Laporan Sengketa */}
                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        <b>Riwayat Perubahan Status:</b>
                        <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                          {r.history?.map((h, i) => (
                            <li key={i}>
                              <b>{STATUS[h.status]?.label || h.status}</b> ({fmtDate(h.at)})
                              {h.note && <span> — {h.note}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MODERASI SPAM DAN FOTO TIDAK RELEVAN */}
        {/* ============================================================== */}
        {tab === "moderasi" && (
          <div className="adm-card">
            <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>
              Moderasi Konten & Sensor Foto Tidak Relevan
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#64748B" }}>
              Tinjau foto yang diunggah warga. Sensor foto yang tidak sesuai kategori fasilitas publik dan bersihkan laporan spam.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "18px" }}>
              {reports.slice(0, 18).map((r) => (
                <div
                  key={r.code}
                  style={{
                    border: r.photoFlagged ? "2px solid #EF4444" : "1.5px solid var(--mist)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#fff",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ position: "relative", height: "160px", background: "#E2E8F0" }}>
                    {r.photoFlagged ? (
                      <div
                        style={{
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          background: "#FEE2E2",
                          color: "#991B1B",
                          padding: "16px",
                          textAlign: "center"
                        }}
                      >
                        <div>
                          <Icon name="eyeOff" size={24} style={{ color: "#DC2626", marginBottom: "6px" }} />
                          <b style={{ display: "block", fontSize: "12px" }}>FOTO TELAH DISENSOR</b>
                          <small style={{ fontSize: "11px" }}>Ditandai tidak relevan oleh moderator</small>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={r.photoUrl || samplePhoto(r.category, 300, 160)}
                        alt={r.category}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: "rgba(10,30,45,0.85)",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "700"
                      }}
                    >
                      {r.code}
                    </span>
                  </div>

                  <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <b style={{ fontSize: "14px" }}>{r.category}</b>
                      <span className="pg-chip" style={{ fontSize: "11px", padding: "1px 6px" }}>
                        {STATUS[r.status]?.label || r.status}
                      </span>
                    </div>
                    <small style={{ color: "#64748B", fontSize: "12px", marginBottom: "8px" }}>
                      Kecamatan {r.kecName || r.kec}
                    </small>
                    <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "#475569", flex: 1 }}>
                      {r.description || `Laporan ${r.category.toLowerCase()}`}
                    </p>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
                      {r.photoFlagged ? (
                        <button
                          className="adm-btn-sm adm-btn-outline"
                          style={{ flex: 1 }}
                          onClick={() => handleModerate(r.code, "unflag_photo")}
                        >
                          <Icon name="eye" size={13} /> Buka Sensor
                        </button>
                      ) : (
                        <button
                          className="adm-btn-sm adm-btn-danger"
                          style={{ flex: 1 }}
                          onClick={() => handleModerate(r.code, "flag_photo")}
                        >
                          <Icon name="eyeOff" size={13} /> Sensor Foto
                        </button>
                      )}

                      <button
                        className="adm-btn-sm adm-btn-outline"
                        style={{ color: "#DC2626", borderColor: "#FCA5A5" }}
                        onClick={() => handleDeleteReport(r.code)}
                        title="Hapus laporan spam"
                      >
                        <Icon name="trash" size={13} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: PETA LAPORAN DAN WILAYAH SUNYI */}
        {/* ============================================================== */}
        {tab === "peta" && (
          <div className="adm-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
              <div>
                <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>
                  Peta Sebaran Spasial & Pemantauan Wilayah Sunyi
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Monitoring visual sebaran titik masalah di 18 kecamatan Kabupaten Sidoarjo dan pengawasan kecamatan lengang.
                </p>
              </div>
            </div>

            <AdminMap
              reports={reports}
              onSelectReport={(code) => {
                const found = reports.find((r) => r.code === code);
                if (found) setDetailModalReport(found);
              }}
              onQuickStatusChange={(r) => handleOpenStatusModal(r)}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: KOTAK KELUHAN DAN MASUKAN WARGA */}
        {/* ============================================================== */}
        {tab === "keluhan" && (
          <div className="adm-card">
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <h2 style={{ fontSize: "18px", margin: 0 }}>Kotak Masukan, Keluhan, dan Permohonan Warga</h2>
                <span className="adm-badge adm-badge-blue">{complaints.length} Pesan</span>
              </div>

              {/* Kalimat Wajib Sesuai Instruksi Pengguna */}
              <div
                style={{
                  background: "#EFF6FF",
                  borderLeft: "4px solid #2563EB",
                  padding: "12px 16px",
                  borderRadius: "4px 8px 8px 4px",
                  margin: "12px 0 16px"
                }}
              >
                <p style={{ margin: 0, fontSize: "14px", color: "#1E3A8A", fontWeight: "600" }}>
                  "Untuk pertanyaan, masukan, dan permintaan penghapusan data laporan. Sertakan kode tiket bila menyangkut laporan tertentu."
                </p>
                <small style={{ color: "#3B82F6", display: "block", marginTop: "4px" }}>
                  Pesan warga langsung masuk ke panel admin ini dan tersimpan di database tanpa perantara email.
                </small>
              </div>
            </div>

            {/* Filter Jenis Keluhan */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {["", "Permintaan Penghapusan Data Laporan", "Keluhan Masalah", "Masukan", "Pertanyaan", "Belum Ditinjau"].map((f) => (
                <button
                  key={f}
                  className={`adm-btn-sm ${complaintFilter === f ? "adm-btn-primary" : "adm-btn-outline"}`}
                  onClick={() => setComplaintFilter(f)}
                >
                  {f === "" ? "Semua Pesan" : f}
                </button>
              ))}
            </div>

            {/* Daftar Keluhan */}
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Jenis Pesan</th>
                    <th>Tiket Terkait</th>
                    <th>Pengirim & Kontak</th>
                    <th>Isi Pesan / Keluhan</th>
                    <th>Waktu Masuk</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Tindakan Pengelola</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#64748B" }}>
                        Belum ada pesan pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => {
                      const isDeleteReq = c.type === "Permintaan Penghapusan Data Laporan";
                      return (
                        <tr key={c.id} style={{ background: isDeleteReq ? "#FFFDF5" : undefined }}>
                          <td><b>{c.id}</b></td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: isDeleteReq ? "#FEE2E2" : "#E0F2FE",
                                color: isDeleteReq ? "#991B1B" : "#0369A1"
                              }}
                            >
                              {c.type}
                            </span>
                          </td>
                          <td>
                            {c.ticketCode ? (
                              <button
                                className="pg-code"
                                onClick={() => {
                                  const r = reports.find((x) => x.code === c.ticketCode);
                                  if (r) setDetailModalReport(r);
                                  else alert(`Laporan ${c.ticketCode} tidak ditemukan atau sudah dihapus.`);
                                }}
                              >
                                {c.ticketCode}
                              </button>
                            ) : (
                              <span style={{ color: "#94A3B8" }}>-</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: "600" }}>{c.sender}</div>
                            <div style={{ fontSize: "11px", color: "#64748B" }}>{c.contact || "Tanpa kontak"}</div>
                          </td>
                          <td style={{ maxWidth: "320px", fontSize: "13px", lineHeight: 1.4 }}>
                            {c.message}
                          </td>
                          <td style={{ fontSize: "12px", color: "#64748B", whiteSpace: "nowrap" }}>
                            {fmtDate(c.createdAt)}
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "99px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: c.status.includes("Selesai") ? "#DCFCE7" : "#FEF3C7",
                                color: c.status.includes("Selesai") ? "#166534" : "#92400E"
                              }}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {isDeleteReq && c.ticketCode && !c.status.includes("Selesai") && (
                                <button
                                  className="adm-btn-sm adm-btn-danger"
                                  onClick={() => handleFulfillDeleteRequest(c)}
                                  title="Hapus data laporan yang bersangkutan dari Ranawarta"
                                >
                                  <Icon name="trash" size={13} /> Setujui Hapus Laporan
                                </button>
                              )}

                              {c.status !== "Selesai" ? (
                                <button
                                  className="adm-btn-sm adm-btn-primary"
                                  onClick={() => runComplaintAction(() => updateComplaintStatus(c.id, "Selesai"))}
                                >
                                  <Icon name="check" size={13} /> Tandai Selesai
                                </button>
                              ) : (
                                <button
                                  className="adm-btn-sm adm-btn-outline"
                                  onClick={() => runComplaintAction(() => updateComplaintStatus(c.id, "Belum Ditinjau"))}
                                >
                                  Buka Lagi
                                </button>
                              )}

                              <button
                                className="adm-btn-sm adm-btn-outline"
                                style={{ color: "#94A3B8" }}
                                onClick={() => {
                                  if (window.confirm("Hapus pesan ini dari arsip?")) {
                                    runComplaintAction(() => deleteComplaint(c.id));
                                  }
                                }}
                                title="Hapus pesan"
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: EKSPOR DATA */}
        {/* ============================================================== */}
        {tab === "ekspor" && (
          <div className="adm-card">
            <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>Ekspor Data & Laporan Resmi</h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748B" }}>
              Unduh dataset laporan Ranawarta untuk transparansi, analisis kebijakan publik, integrasi instansi, atau cetak dokumen ringkasan.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
              <div style={{ border: "1.5px solid var(--mist)", borderRadius: "12px", padding: "18px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Icon name="fileText" size={18} style={{ color: "#0F766E" }} />
                  <b style={{ fontSize: "15px" }}>Ekspor Format CSV (.csv)</b>
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Format tabel dengan karakter UTF-8 BOM, kompatibel langsung dengan Microsoft Excel, Google Sheets, dan LibreOffice.
                </p>
                <button
                  className="adm-btn-sm adm-btn-teal"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => exportReportsCSV(reports)}
                >
                  <Icon name="export" size={14} /> Unduh Laporan CSV ({reports.length} Data)
                </button>
              </div>

              <div style={{ border: "1.5px solid var(--mist)", borderRadius: "12px", padding: "18px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Icon name="json" size={18} style={{ color: "#246BFD" }} />
                  <b style={{ fontSize: "15px" }}>Ekspor Format JSON (.json)</b>
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Format data terstruktur lengkap dengan histori waktu per status, koordinat spasial, dan riwayat sengketa.
                </p>
                <button
                  className="adm-btn-sm adm-btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => exportReportsJSON(reports)}
                >
                  <Icon name="export" size={14} /> Unduh Laporan JSON
                </button>
              </div>

              <div style={{ border: "1.5px solid var(--mist)", borderRadius: "12px", padding: "18px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Icon name="inbox" size={18} style={{ color: "#475569" }} />
                  <b style={{ fontSize: "15px" }}>Ekspor Kotak Keluhan (.csv)</b>
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Unduh daftar pesan, pertanyaan, masukan, dan permohonan penghapusan data dari warga.
                </p>
                <button
                  className="adm-btn-sm adm-btn-outline"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => exportComplaintsCSV(complaints)}
                >
                  <Icon name="export" size={14} /> Unduh Keluhan Warga ({complaints.length})
                </button>
              </div>

              <div style={{ border: "1.5px solid var(--mist)", borderRadius: "12px", padding: "18px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Icon name="print" size={18} style={{ color: "#16324F" }} />
                  <b style={{ fontSize: "15px" }}>Cetak Dokumen Ringkasan</b>
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Buka tampilan cetak bersih untuk simpan ke PDF atau dicetak sebagai laporan resmi pengelola.
                </p>
                <button
                  className="adm-btn-sm adm-btn-outline"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => window.print()}
                >
                  <Icon name="print" size={14} /> Cetak Dokumen Ringkasan
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: UBAH STATUS LAPORAN */}
      {/* ============================================================== */}
      {statusModalReport && (
        <div className="adm-modal-backdrop" onClick={() => setStatusModalReport(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h3>Ubah Status: {statusModalReport.code}</h3>
              <button
                className="adm-btn-sm adm-btn-outline"
                onClick={() => setStatusModalReport(null)}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveStatus}>
              <div className="adm-modal-body">
                <div style={{ marginBottom: "14px" }}>
                  <b style={{ fontSize: "14px", color: "#16324F" }}>{statusModalReport.category}</b>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748B" }}>
                    Kecamatan {statusModalReport.kecName || statusModalReport.kec} · Status Terkini:{" "}
                    <b>{STATUS[statusModalReport.status]?.label || statusModalReport.status}</b>
                  </p>
                </div>

                <label style={{ display: "block", marginBottom: "14px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                    Pilih Status Baru:
                  </span>
                  <select
                    className="pg-input"
                    style={{ margin: 0, padding: "10px" }}
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    required
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS[s].long} ({STATUS[s].label})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "block", marginBottom: "14px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                    Catatan Petugas / Penanganan Resmi:
                  </span>
                  <textarea
                    className="pg-input"
                    rows={3}
                    style={{ margin: 0, padding: "10px" }}
                    placeholder="Contoh: Petugas perbaikan telah menyelesaikan pengaspalan jalan di lokasi."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </label>

                <div style={{ background: "#F0FDFA", border: "1px solid #99F6E4", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", color: "#115E59" }}>
                  Perubahan status akan langsung tersimpan dan otomatis diperbarui di seluruh sistem data publik.
                </div>
              </div>

              <div className="adm-modal-foot">
                <button
                  type="button"
                  className="adm-btn-sm adm-btn-outline"
                  onClick={() => setStatusModalReport(null)}
                >
                  Batal
                </button>
                <button type="submit" className="adm-btn-sm adm-btn-primary">
                  <Icon name="check" size={14} /> Simpan Perubahan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DETAIL LAPORAN & RIWAYAT */}
      {/* ============================================================== */}
      {detailModalReport && (
        <div className="adm-modal-backdrop" onClick={() => setDetailModalReport(null)}>
          <div className="adm-modal" style={{ maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h3>Detail Tiket: {detailModalReport.code}</h3>
              <button
                className="adm-btn-sm adm-btn-outline"
                onClick={() => setDetailModalReport(null)}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <div className="adm-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "16px", marginBottom: "16px" }}>
                <img
                  src={detailModalReport.photoUrl || samplePhoto(detailModalReport.category, 200, 150)}
                  alt=""
                  style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                />
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "17px" }}>{detailModalReport.category}</h3>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#64748B" }}>
                    Kecamatan: <b>{detailModalReport.kecName || detailModalReport.kec}</b>
                  </p>
                  <span className="pg-chip" style={{ fontSize: "13px" }}>
                    <StatusShape status={detailModalReport.status} size={16} />
                    {STATUS[detailModalReport.status]?.long || detailModalReport.status}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <b style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Keterangan Laporan:</b>
                <p style={{ margin: 0, fontSize: "13.5px", background: "#F8FAFC", padding: "10px", borderRadius: "8px" }}>
                  {detailModalReport.description || "-"}
                </p>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <b style={{ fontSize: "13px", display: "block", marginBottom: "6px" }}>Timeline & Riwayat Status:</b>
                <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px" }}>
                  {detailModalReport.history?.map((h, i) => (
                    <li key={i} style={{ marginBottom: "6px" }}>
                      <b>{STATUS[h.status]?.label || h.status}</b> ({fmtDate(h.at)})
                      {h.note && <div style={{ color: "#64748B", fontSize: "12px" }}>Catatan: {h.note}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="adm-modal-foot">
              <button
                className="adm-btn-sm adm-btn-primary"
                onClick={() => {
                  setDetailModalReport(null);
                  handleOpenStatusModal(detailModalReport);
                }}
              >
                Ubah Status
              </button>
              <button
                className="adm-btn-sm adm-btn-outline"
                onClick={() => setDetailModalReport(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PRATINJAU FOTO MODERASI */}
      {/* ============================================================== */}
      {moderationPhotoModal && (
        <div className="adm-modal-backdrop" onClick={() => setModerationPhotoModal(null)}>
          <div className="adm-modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h3>Foto Laporan: {moderationPhotoModal.code}</h3>
              <button
                className="adm-btn-sm adm-btn-outline"
                onClick={() => setModerationPhotoModal(null)}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="adm-modal-body" style={{ textAlign: "center" }}>
              <img
                src={moderationPhotoModal.photoUrl || samplePhoto(moderationPhotoModal.category, 600, 400)}
                alt=""
                style={{ width: "100%", maxHeight: "360px", objectFit: "contain", borderRadius: "8px" }}
              />
              <p style={{ marginTop: "10px", fontSize: "13px", color: "#64748B" }}>
                {moderationPhotoModal.category} · Kec. {moderationPhotoModal.kecName || moderationPhotoModal.kec}
              </p>
            </div>
            <div className="adm-modal-foot">
              {moderationPhotoModal.photoFlagged ? (
                <button
                  className="adm-btn-sm adm-btn-outline"
                  onClick={() => {
                    handleModerate(moderationPhotoModal.code, "unflag_photo");
                    setModerationPhotoModal(null);
                  }}
                >
                  <Icon name="eye" size={14} /> Buka Sensor
                </button>
              ) : (
                <button
                  className="adm-btn-sm adm-btn-danger"
                  onClick={() => {
                    handleModerate(moderationPhotoModal.code, "flag_photo");
                    setModerationPhotoModal(null);
                  }}
                >
                  <Icon name="eyeOff" size={14} /> Sensor Foto Tidak Relevan
                </button>
              )}
              <button
                className="adm-btn-sm adm-btn-outline"
                onClick={() => setModerationPhotoModal(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
