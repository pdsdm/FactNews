"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trash2,
  X,
  Zap,
  Users,
  Swords,
  Crown,
  ThumbsDown,
  Search,
} from "lucide-react";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { timeAgo } from "@/lib/utils";

type Tab = "search" | "arena";

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("search");
  useEffect(() => setMounted(true), []);

  const {
    entries,
    arenaEntries,
    removeEntry,
    removeArenaEntry,
    clearHistory,
    clearArenaHistory,
  } = useSearchHistoryStore();

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Search History
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {entries.length} searches · {arenaEntries.length} arena battles
            </p>
          </div>
          {(entries.length > 0 || arenaEntries.length > 0) && (
            <button
              onClick={() => {
                if (tab === "search") clearHistory();
                else clearArenaHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear {tab === "search" ? "All" : "Arena"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setTab("search")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === "search"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Searches
            {entries.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-600 rounded-full">
                {entries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("arena")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === "arena"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Arena
            {arenaEntries.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-600 rounded-full">
                {arenaEntries.length}
              </span>
            )}
          </button>
        </div>

        {/* Search History Tab */}
        {tab === "search" && (
          <>
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
                {entries.map((entry) => {
                  const isFast = entry.mode === "fast";
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700"
                    >
                      <Link
                        href={`/topic/${entry.id}`}
                        className="flex-1 min-w-0"
                      >
                        <p className="font-medium text-sm text-slate-900 truncate dark:text-slate-100">
                          {entry.query}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {/* Mode badge */}
                          {isFast ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Zap className="w-2.5 h-2.5" />
                              Fast
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <Users className="w-2.5 h-2.5" />
                              Consensus
                            </span>
                          )}
                          <span className="text-slate-300 dark:text-slate-600">
                            |
                          </span>
                          <span>{timeAgo(entry.timestamp)}</span>
                          <span>&middot;</span>
                          <span>{entry.factsCount} facts</span>
                          {entry.consensusScore !== null && (
                            <>
                              <span>&middot;</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {Math.round(entry.consensusScore * 100)}%
                                consensus
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
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Arena History Tab */}
        {tab === "arena" && (
          <>
            {arenaEntries.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 dark:text-slate-500">
                  No arena battles yet.
                </p>
                <Link
                  href="/arena"
                  className="inline-block mt-4 px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Go to Arena
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {arenaEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                        <Swords className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                          {entry.query}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>{timeAgo(entry.timestamp)}</span>
                          <span>&middot;</span>
                          <span>{entry.modelsCount} models</span>
                        </div>
                        {/* Best / Worst badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.bestModel && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                              <Crown className="w-2.5 h-2.5" />
                              {entry.bestModel}
                            </span>
                          )}
                          {entry.worstModel && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                              <ThumbsDown className="w-2.5 h-2.5" />
                              {entry.worstModel}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeArenaEntry(entry.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-950/30 flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
