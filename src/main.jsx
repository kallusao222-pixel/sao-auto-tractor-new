import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/* ---------- Global styles ---------- */
import "./styles/design-system.css";
import "./styles/globals.css";

import App from "./App.jsx";

/* ---------- PWA: Service Worker registration ---------- */
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,

  onRegisteredSW(swUrl, registration) {
    // Optional: log for debugging
    // console.log("[PWA] Service worker registered:", swUrl);

    // Auto-check for updates every hour
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    }
  },

  onRegisterError(error) {
    console.warn("[PWA] Service worker registration failed:", error);
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);