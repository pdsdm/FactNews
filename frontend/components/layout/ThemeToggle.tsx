"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import type { Theme } from "@/lib/types";

const icons: Record<Theme, React.ReactNode> = {
  light: <Sun className="w-4 h-4" />,
  dark: <Moon className="w-4 h-4" />,
  system: <Monitor className="w-4 h-4" />,
};

const nextTheme: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <button
      onClick={() => setTheme(nextTheme[theme])}
      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
      title={`Theme: ${theme}`}
    >
      {icons[theme]}
    </button>
  );
}
