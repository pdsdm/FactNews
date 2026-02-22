"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/themeStore";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme, mounted]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Top header nav — hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Main content — offset by header on desktop, padded bottom on mobile */}
      <main className="pt-0 md:pt-14 pb-16 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
