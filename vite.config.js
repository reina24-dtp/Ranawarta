import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import aiServer from "./server/vite-ai-plugin.js";
export default defineConfig({ plugins: [react(), aiServer()], server: { open: true } });
