import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/* ---------- Global styles ---------- */
import "./styles/design-system.css";
import "./styles/globals.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);