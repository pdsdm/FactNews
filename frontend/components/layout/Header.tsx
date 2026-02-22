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
  TrendingUp,
} from "lucide-react";

const iconMap = {
  Newspaper,
  Search,
  Globe,
  History,
  Bookmark,
  Swords,
  TrendingUp,
} as const;

const LEFT = [
  { href: "/search", label: "Search", icon: "Search" },
  { href: "/sources", label: "Sources", icon: "Globe" },
  { href: "/history", label: "History", icon: "History" },
] as const;

const CENTER = { href: "/feed", label: "Feed", icon: "Newspaper" } as const;

const RIGHT = [
  { href: "/bookmarks", label: "Bookmarks", icon: "Bookmark" },
  { href: "/arena", label: "Arena", icon: "Swords" },
  { href: "/trending", label: "Trending", icon: "TrendingUp" },
] as const;

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  const Icon = iconMap[icon as keyof typeof iconMap];
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center justify-center gap-0.5 w-20 py-2 transition-colors ${
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-medium">{label}</span>
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-slate-900 rounded-full" />
      )}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="flex items-center justify-center h-14">
        <nav className="flex items-center">
          {/* Left group */}
          {LEFT.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
            />
          ))}

          {/* Center — Feed */}
          <NavLink
            href={CENTER.href}
            label={CENTER.label}
            icon={CENTER.icon}
            active={pathname === "/" || pathname.startsWith("/feed")}
          />

          {/* Right group */}
          {RIGHT.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}

