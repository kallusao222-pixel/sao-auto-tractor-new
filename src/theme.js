import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "saoTheme";
const META_COLOR = {
  light: "#f5f6f3",
  dark: "#111713",
};

function isTheme(value) {
  return value === "light" || value === "dark";
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getSystemTheme() {
  // First visit stays in the app's familiar light appearance. Users can
  // switch to dark mode explicitly and that choice is persisted per browser.
  return "light";
}

export function resolveTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("saoThemeChanged"));
    }
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute(
    "data-theme",
    theme,
  );

  const meta = document.querySelector(
    'meta[name="theme-color"]',
  );

  if (meta) {
    meta.setAttribute(
      "content",
      META_COLOR[theme] || META_COLOR.light,
    );
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(resolveTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => setTheme(resolveTheme());
    window.addEventListener("saoThemeChanged", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("saoThemeChanged", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme =
        currentTheme === "dark"
          ? "light"
          : "dark";

      storeTheme(nextTheme);

      return nextTheme;
    });
  }, []);

  return {
    theme,
    toggleTheme,
  };
}
