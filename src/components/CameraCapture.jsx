import { useEffect, useRef, useState } from "react";
import { processCanvas, fileToCanvas } from "../lib/photo";

/** Kamera langsung (getUserMedia). Cadangan: input capture="environment". TIDAK ada pilihan galeri. */
export default function CameraCapture({ onCapture, onClose }) {
  const vid = useRef(null), stream = useRef(null);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setErr("Kamera langsung tidak tersedia di browser ini. Gunakan tombol di bawah untuk membuka kamera."); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (dead) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s; vid.current.srcObject = s; await vid.current.play(); setReady(true);
      } catch { setErr("Kamera tidak bisa dibuka (izin ditolak atau alamat tidak aman). Gunakan tombol di bawah."); }
    })();
    return () => { dead = true; stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const snap = async () => {
    const v = vid.current, c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0);
    onCapture(await processCanvas(c, new Date().toISOString()));
  };
  const fromInput = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    onCapture(await processCanvas(await fileToCanvas(f), new Date().toISOString()));
  };

  return (
    <div className="pg-cam" role="dialog" aria-modal="true" aria-label="Kamera">
      <div className="pg-cam-box">
        {!err && <video ref={vid} playsInline muted aria-label="Pratinjau kamera" />}
        {err && <p className="pg-cam-err" role="alert">{err}</p>}
        <div className="pg-cam-bar">
          {!err && <button className="pg-primary" disabled={!ready} onClick={snap}>Ambil foto</button>}
          {err && (
            <label className="pg-primary pg-filebtn">Buka kamera
              <input type="file" accept="image/*" capture="environment" onChange={fromInput} />
            </label>
          )}
          <button className="pg-outline" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
