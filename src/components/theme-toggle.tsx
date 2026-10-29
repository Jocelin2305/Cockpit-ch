"use client";

import { useState } from "react";

// Bascule clair / sombre, retenue un an dans un cookie.
export function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark");
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setDark(!dark);
  };
  return (
    <button type="button" className="btn sm ghost" onClick={toggle} aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"} title={dark ? "Thème clair" : "Thème sombre"} suppressHydrationWarning>
      {dark ? "☀" : "☾"}
    </button>
  );
}
