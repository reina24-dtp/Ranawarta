// Fungsi serverless Vercel: /api/ai/check-photo, /api/ai/compare, /api/ai/draft-letter
import { handleAi } from "../../server/ai-handlers.js";
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };
export default async function handler(req, res) {
  // Izinkan situs Firebase memanggil API ini. Ganti lewat env ALLOWED_ORIGIN bila alamat situs berubah.
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://ranawarta.web.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "gunakan POST" });
  const ip = String(req.headers["x-forwarded-for"] || "-").split(",")[0];
  const r = await handleAi(req.query.action, req.body, ip);
  res.status(r.status).json(r.json);
}
