"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { timeAgo } from "@/lib/utils";

export default function BookmarksPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { bookmarks, removeBookmark } = useBookmarkStore();

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Bookmarks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {bookmarks.length}{" "}
            {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
          </p>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 dark:text-slate-500">
              No bookmarks yet.
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
            {bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700"
              >
                <Link
                  href={`/topic/${bm.id}?source=bookmarks`}
                  className="flex-1 min-w-0"
                >
                  <p className="font-medium text-sm text-slate-900 truncate dark:text-slate-100">
                    {bm.query}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>Saved {timeAgo(bm.savedAt)}</span>
                    <span>&middot;</span>
                    <span>{bm.response.facts.length} facts</span>
                    <span>&middot;</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {Math.round(bm.response.consensus_score * 100)}% consensus
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => removeBookmark(bm.id)}
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
