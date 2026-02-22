"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  Search,
  Globe,
  History,
  Bookmark,
  Swords,
  RefreshCw,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";
import { useStats } from "@/hooks/useStats";
import { useRefresh } from "@/hooks/useRefresh";

const iconMap = {
  Newspaper,
  Search,
  Globe,
  History,
  Bookmark,
  Swords,
} as const;

export function Header() {
  const pathname = usePathname();
  const { stats, refresh: refreshStats } = useStats();
  const { refreshing, refresh: refreshNews } = useRefresh(refreshStats);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center h-14 gap-8">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 bg-slate-900 rounded dark:bg-white" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            FactNews
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side — stats, theme, refresh */}
        <div className="ml-auto flex items-center gap-2">
          {stats && (
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
              {stats.articles_indexed} articles &middot; {stats.sources} sources
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={refreshNews}
            disabled={refreshing}
            title="Refresh news"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
