"use client";

import { SOURCE_FILTER_LABELS } from "@/lib/constants";

const KNOWN_SOURCES = Object.keys(SOURCE_FILTER_LABELS);

interface SourceFilterProps {
  active: string | null;
  onChange: (source: string | null) => void;
}

export function SourceFilter({ active, onChange }: SourceFilterProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          active === null
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        }`}
      >
        All
      </button>
      {KNOWN_SOURCES.map((source) => (
        <button
          key={source}
          onClick={() => onChange(active === source ? null : source)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            active === source
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          {SOURCE_FILTER_LABELS[source]}
        </button>
      ))}
    </div>
  );
}
