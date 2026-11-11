import { useState } from "react";
import { addComplaint } from "../lib/complaintsRepo";

const TYPES = [
  "Pertanyaan",
  "Masukan",
  "Permintaan Penghapusan Data Laporan",
  "Keluhan Masalah",
  "Lainnya"
];

export default function ComplaintBox() {
  const [type, setType] = useState(TYPES[0]);
  const [ticket, setTicket] = useState("");
  const [sender, setSender] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setErr("Mohon tuliskan isi keluhan, masukan, atau pesan Anda.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const result = await addComplaint({ type, ticketCode: ticket, sender, contact, message });
      setQueued(!!result.queued);
      setSent(true);
      setMessage("");
      setTicket("");
      setSender("");
      setContact("");
    } catch (error) {
      setErr(error.message || "Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="pg-card" style={{ background: "#ECFDF5", borderColor: "#10B981", marginTop: "14px" }}>
        <h3 style={{ color: "#065F46", margin: "0 0 6px 0", fontSize: "16px" }}>✓ Pesan Berhasil Terkirim ke Admin</h3>
        <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#047857" }}>
          {queued
            ? "Pesan tersimpan sementara di perangkat dan akan dikirim otomatis saat koneksi kembali."
            : "Pesan, keluhan, atau permohonan Anda telah masuk ke Supabase dan tersedia di Dashboard Admin Ranawarta."}
        </p>
        <button className="pg-pill" onClick={() => setSent(false)}>Kirim pesan lain</button>
      </div>
    );
  }

  return (
    <form className="pg-card" onSubmit={handleSubmit} style={{ marginTop: "16px", background: "#FFFFFF" }}>
      <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Formulir Keluhan dan Permintaan Warga</h3>
      <p className="pg-muted" style={{ marginBottom: "16px", fontSize: "13.5px" }}>
        Untuk pertanyaan, masukan, dan permintaan penghapusan data laporan. Sertakan kode tiket bila menyangkut laporan tertentu. Pesan Anda langsung dikirim ke Panel Admin tanpa perantara email.
      </p>

      {err && <p className="pg-warn" role="alert" style={{ marginBottom: "12px" }}>{err}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
        <label>
          <span style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Jenis Pesan</span>
          <select
            className="pg-input"
            style={{ margin: 0, padding: "8px 10px" }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label>
          <span style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Kode Tiket (Bila Ada)</span>
          <input
            className="pg-input"
            style={{ margin: 0, padding: "8px 10px" }}
            type="text"
            placeholder="Contoh: RW-0421"
            value={ticket}
            onChange={(e) => setTicket(e.target.value.toUpperCase())}
          />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
        <label>
          <span style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Nama / Panggilan (Opsional)</span>
          <input
            className="pg-input"
            style={{ margin: 0, padding: "8px 10px" }}
            type="text"
            placeholder="Warga Sidoarjo"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
          />
        </label>

        <label>
          <span style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Kontak / No. HP (Opsional)</span>
          <input
            className="pg-input"
            style={{ margin: 0, padding: "8px 10px" }}
            type="text"
            placeholder="No. WhatsApp / telp jika ingin dihubungi"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
      </div>

      <label style={{ display: "block", marginBottom: "14px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Isi Keluhan / Masukan / Alasan Permohonan Hapus *</span>
        <textarea
          className="pg-input"
          style={{ margin: 0, minHeight: "100px", padding: "10px" }}
          rows={4}
          placeholder="Tuliskan pesan lengkap Anda di sini..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </label>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="pg-primary" disabled={busy} style={{ padding: "10px 24px" }}>
          {busy ? "Mengirim…" : "Kirim Pesan ke Admin"}
        </button>
      </div>
    </form>
  );
}
