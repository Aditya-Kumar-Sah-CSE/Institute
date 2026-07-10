"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: "36px", height: "36px" }} />; // Placeholder to stop layout shift
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={{
        padding: "var(--space-2)",
        borderRadius: "var(--radius-lg)",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all var(--transition-normal)",
      }}
      className="theme-toggle-btn group hover:bg-glass-bg-hover focus-visible:ring-2 focus-visible:ring-border-focus"
      aria-label="Toggle Theme"
      title="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun 
          color="var(--accent-warning)" 
          size={20} 
          style={{ transition: "transform var(--transition-bounce)" }}
          className="group-hover:rotate-45 group-hover:scale-110" 
        />
      ) : (
        <Moon 
          color="var(--text-primary)" 
          size={20} 
          style={{ transition: "transform var(--transition-bounce)" }}
          className="group-hover:-rotate-12 group-hover:scale-110" 
        />
      )}
    </button>
  );
}
