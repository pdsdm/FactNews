"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Navigation } from "./Navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useStats } from "@/hooks/useStats";
import { useRefresh } from "@/hooks/useRefresh";

export function Sidebar() {
  const { stats, refresh: refreshStats } = useStats();
  const { refreshing, refresh: refreshNews } = useRefresh(refreshStats);

  return (
    <aside className="fixed top-0 left-0 h-full w-56 border-r border-slate-200 bg-white flex flex-col dark:border-slate-800 dark:bg-slate-950 z-40">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 rounded dark:bg-white" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            FactNews
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 py-3 overflow-y-auto">
        <Navigation />
      </div>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {stats && (
          <p className="text-xs text-slate-400 dark:text-slate-500 px-2">
            {stats.articles_indexed} articles &middot; {stats.sources} sources
          </p>
        )}
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={refreshNews}
            disabled={refreshing}
            title="Refresh news"
            className="p-1.5 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
