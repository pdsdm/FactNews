"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useArticles } from "@/hooks/useArticles";
import { FeedGrid } from "@/components/feed/FeedGrid";
import { SourceFilter } from "@/components/feed/SourceFilter";
import { CategoryChips } from "@/components/search/CategoryChips";
import { Loader2 } from "lucide-react";

export default function FeedPage() {
  const router = useRouter();
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const { articles, loading, error, loadMore, hasMore } = useArticles(
    activeSource ?? undefined,
  );

  const handleCategorySelect = useCallback(
    (category: string) => {
      router.push(`/search?q=${encodeURIComponent(category)}`);
    },
    [router],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          News Feed
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Latest articles — click any story to fact-check it
        </p>
      </div>

      {/* Category chips */}
      <div className="mb-6">
        <CategoryChips onSelect={handleCategorySelect} />
      </div>

      {/* Source filter */}
      <div className="mb-6">
        <SourceFilter active={activeSource} onChange={setActiveSource} />
      </div>

      {/* Content */}
      {error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            Could not load articles.
          </p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      ) : loading && articles.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <FeedGrid articles={articles} />

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
