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
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap = {
  Newspaper,
  Search,
  Globe,
  History,
  Bookmark,
  Swords,
} as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-slate-200 bg-white flex items-center justify-around px-2 dark:border-slate-800 dark:bg-slate-950 z-40">
      {NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap];
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? "text-slate-900 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
