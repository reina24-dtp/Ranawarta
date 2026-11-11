import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./responsive.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: service worker (hanya build produksi). Uji offline: npm run build && npm run preview
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
