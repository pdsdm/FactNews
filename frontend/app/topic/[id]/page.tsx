"use client";

import { useState, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { ResultsContainer } from "@/components/results/ResultsContainer";
import type { ConsensusResponse } from "@/lib/types";

interface TopicPageProps {
  params: Promise<{ id: string }>;
}

type Snapshot = { query: string; response: ConsensusResponse };

function TopicContent({ params }: TopicPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const source = searchParams.get("source");

  const historyEntry = useSearchHistoryStore((s) => s.getEntry(id));
  const bookmarkEntry = useBookmarkStore((s) => s.getBookmark(id));

  // Capture the first valid data so it survives if the store entry is later removed.
  const resolved: Snapshot | null = (() => {
    if (source === "bookmarks" && bookmarkEntry) {
      return { query: bookmarkEntry.query, response: bookmarkEntry.response };
    }
    if (historyEntry?.response) {
      return { query: historyEntry.query, response: historyEntry.response };
    }
    if (bookmarkEntry) {
      return { query: bookmarkEntry.query, response: bookmarkEntry.response };
    }
    return null;
  })();

  // Once we have data, keep it in state so it survives store removals.
  const [captured] = useState<Snapshot | null>(() => resolved);
  const snapshot = captured ?? resolved;

  if (!snapshot) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 pt-10">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mb-6 dark:text-blue-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to History
          </Link>
          <div className="text-center py-16">
            <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-slate-100">
              Result not found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This search result may have been removed from your history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { query, response } = snapshot;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={source === "bookmarks" ? "/bookmarks" : "/history"}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-run Search
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search query
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-times-new-roman">
            {query}
          </h1>
        </div>

        {response ? (
          <ResultsContainer response={response} query={query} />
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No response data available for this search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TopicPage(props: TopicPageProps) {
  return (
    <Suspense>
      <TopicContent {...props} />
    </Suspense>
  );
}
