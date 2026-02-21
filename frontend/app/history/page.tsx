"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { timeAgo } from "@/lib/utils";

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { entries, removeEntry, clearHistory } = useSearchHistoryStore();

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Search History
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {entries.length} {entries.length === 1 ? "search" : "searches"}
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 dark:text-slate-500">
              No search history yet.
            </p>
            <Link
              href="/search"
              className="inline-block mt-4 px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Start Searching
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700"
              >
                <Link href={`/topic/${entry.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate dark:text-slate-100">
                    {entry.query}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{timeAgo(entry.timestamp)}</span>
                    <span>&middot;</span>
                    <span>{entry.factsCount} facts</span>
                    {entry.consensusScore !== null && (
                      <>
                        <span>&middot;</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {Math.round(entry.consensusScore * 100)}% consensus
                        </span>
                      </>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-950/30"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
