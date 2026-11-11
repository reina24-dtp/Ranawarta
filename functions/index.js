
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const geminiKey = defineSecret("GEMINI_API_KEY");

exports.ai = onRequest(
  {
    region: "asia-southeast1",
    secrets: [geminiKey],
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    process.env.GEMINI_API_KEY = geminiKey.value();

    const { handleAi } = await import("./ai-handlers.js");

    if (req.method !== "POST") {
      return res.status(405).json({ error: "gunakan POST" });
    }

    const action = req.path.split("/").filter(Boolean).pop();

    const result = await handleAi(
      action,
      req.body || {},
      req.ip || "-"
    );

    return res.status(result.status).json(result.json);
  }
);
