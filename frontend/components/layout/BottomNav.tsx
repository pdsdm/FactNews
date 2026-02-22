"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  Search,
  Globe,
  History,
  Bookmark,
  Users,
  TrendingUp,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap = {
  Newspaper,
  Search,
  Globe,
  History,
  Bookmark,
  Users,
  TrendingUp,
} as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-slate-200 bg-white flex items-center justify-around px-2 z-40">
      {NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap];
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              isActive ? "text-slate-900" : "text-slate-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
            {isActive && (
              <span className="absolute top-0 left-2 right-2 h-[2px] bg-slate-900 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
