
import { handleAi } from "../../../server/ai-handlers.js";

export async function onRequest(context) {
  const { request, params } = context;

  const send = (status, json) =>
    new Response(JSON.stringify(json), {
      status,
      headers: { "content-type": "application/json" },
    });

  if (request.method !== "POST") {
    return send(405, { error: "gunakan POST" });
  }

  try {
    const text = await request.text();

    if (new TextEncoder().encode(text).length > 12e6) {
      return send(413, { error: "terlalu besar" });
    }

    let body;
    try {
      body = JSON.parse(text || "{}");
    } catch {
      return send(400, { error: "JSON tidak valid" });
    }

    const action = Array.isArray(params.action)
      ? params.action.join("/")
      : params.action;

    const ip = request.headers.get("CF-Connecting-IP") || "-";

    const result = await handleAi(action, body, ip);

    return send(result.status, result.json);
  } catch (error) {
    console.error("[Cloudflare AI]", error);
    return send(500, { error: "server gagal memproses permintaan" });
  }
}
