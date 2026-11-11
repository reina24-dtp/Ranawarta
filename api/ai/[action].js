// Fungsi serverless Vercel: /api/ai/check-photo, /api/ai/compare, /api/ai/draft-letter
import { handleAi } from "../../server/ai-handlers.js";
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "gunakan POST" });
  const ip = String(req.headers["x-forwarded-for"] || "-").split(",")[0];
  const r = await handleAi(req.query.action, req.body, ip);
  res.status(r.status).json(r.json);
}
