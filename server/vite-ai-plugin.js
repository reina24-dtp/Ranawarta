// Menjalankan /api/ai/* saat `npm run dev` dan `npm run preview`. Kunci dibaca dari .env (tanpa awalan VITE_).
import { loadEnv } from "vite";
import { handleAi } from "./ai-handlers.js";

export default function aiServer() {
  const mount = (server) => {
    Object.assign(process.env, { ...loadEnv(server.config?.mode || "development", process.cwd(), ""), ...process.env });
    server.middlewares.use("/api/ai", (req, res) => {
      const send = (status, json) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(json)); };
      if (req.method !== "POST") return send(405, { error: "gunakan POST" });
      let size = 0; const chunks = [];
      req.on("data", (c) => { size += c.length; if (size > 12e6) { send(413, { error: "terlalu besar" }); req.destroy(); } else chunks.push(c); });
      req.on("end", async () => {
        let body; try { body = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return send(400, { error: "JSON tidak valid" }); }
        const r = await handleAi(req.url.replace(/^\/|\?.*$/g, ""), body, req.socket.remoteAddress);
        send(r.status, r.json);
      });
    });
  };
  return { name: "ranawarta-ai", configureServer: mount, configurePreviewServer: mount };
}
