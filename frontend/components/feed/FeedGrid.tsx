"use client";

import { ArticleCard } from "./ArticleCard";
import type { Article } from "@/lib/types";

interface FeedGridProps {
  articles: Article[];
}

export function FeedGrid({ articles }: FeedGridProps) {
  if (articles.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 py-12 text-center">
        No articles found.
      </p>
    );
  }

  const [hero, ...rest] = articles;

  return (
    <div className="space-y-4">
      {/* Hero row: big card + 2 regular */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <ArticleCard article={hero} hero />
        </div>
        <div className="flex flex-col gap-4">
          {rest.slice(0, 2).map((a) => (
            <ArticleCard key={a.id ?? a.url} article={a} />
          ))}
        </div>
      </div>

      {/* Rest: 3-column grid */}
      {rest.length > 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.slice(2).map((a) => (
            <ArticleCard key={a.id ?? a.url} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
