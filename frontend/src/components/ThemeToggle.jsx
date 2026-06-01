import React, { useEffect } from "react";

export default function ThemeToggle() {
  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) document.documentElement.dataset.theme = saved;
  }, []);

  const toggle = () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  };

  return (
    <button
      id="theme-toggle"
      aria-label="Toggle dark mode"
      className="theme-toggle"
      onClick={toggle}
    >
      🌙
    </button>
  );
}
