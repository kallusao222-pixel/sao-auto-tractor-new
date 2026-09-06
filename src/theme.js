import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "saoTheme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

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
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(DARK_QUERY).matches
    ? "dark"
    : "light";
}

export function resolveTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
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
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia(DARK_QUERY);

    const handleChange = (event) => {
      if (getStoredTheme() === null) {
        setTheme(
          event.matches ? "dark" : "light",
        );
      }
    };

    media.addEventListener(
      "change",
      handleChange,
    );

    return () => {
      media.removeEventListener(
        "change",
        handleChange,
      );
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