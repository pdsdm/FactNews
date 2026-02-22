"use client";

import { useState, useEffect, useRef, use, Suspense } from "react";
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

function TopicContent({ params }: TopicPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const source = searchParams.get("source");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const historyEntry = useSearchHistoryStore((s) => s.getEntry(id));
  const bookmarkEntry = useBookmarkStore((s) => s.getBookmark(id));

  // Snapshot the first valid data so the page stays visible if the user
  // unsaves/removes the entry while viewing it.
  const snapshotRef = useRef<{ query: string; response: ConsensusResponse } | null>(null);

  if (mounted && !snapshotRef.current) {
    if (source === "bookmarks" && bookmarkEntry) {
      snapshotRef.current = { query: bookmarkEntry.query, response: bookmarkEntry.response };
    } else if (historyEntry?.response) {
      snapshotRef.current = { query: historyEntry.query, response: historyEntry.response };
    } else if (bookmarkEntry) {
      snapshotRef.current = { query: bookmarkEntry.query, response: bookmarkEntry.response };
    }
  }

  if (!mounted) return null;

  const pageData = snapshotRef.current;

  if (!pageData) {
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

  const { query, response } = pageData;

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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
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
