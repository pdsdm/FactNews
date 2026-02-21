"use client";

import { SEARCH_CATEGORIES } from "@/lib/constants";

interface CategoryChipsProps {
  onSelect: (category: string) => void;
}

export function CategoryChips({ onSelect }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      {SEARCH_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
