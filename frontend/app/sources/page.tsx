"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { StatsOverview } from "@/components/dashboard/DashboardComponents";
import { SourceCard } from "@/components/sources/SourceCard";

export default function SourcesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useSearchHistoryStore((s) => s.entries);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      if (!entry.response) continue;
      for (const fact of entry.response.facts) {
        if (fact.source_names) {
          for (const name of fact.source_names) {
            counts[name] = (counts[name] || 0) + 1;
          }
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [entries]);

  const knownSources = [
    "CNN",
    "BBC News",
    "The New York Times",
    "The Guardian",
    "Reuters",
    "TechCrunch",
    "The Wall Street Journal",
    "Bloomberg",
    "Wired",
    "Ars Technica",
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Sources
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            News outlets tracked by the system
          </p>
        </div>

        <StatsOverview />

        <h2 className="text-lg font-semibold text-slate-900 mb-3 dark:text-slate-100">
          Tracked Sources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
          {knownSources.map((source) => {
            const found = sourceCounts.find((s) => s.name === source);
            return (
              <SourceCard
                key={source}
                name={source}
                articleCount={found?.count || 0}
              />
            );
          })}
        </div>

        {mounted && sourceCounts.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-slate-900 mb-3 dark:text-slate-100">
              Sources from Your Searches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sourceCounts
                .filter((s) => !knownSources.includes(s.name))
                .map((source) => (
                  <SourceCard
                    key={source.name}
                    name={source.name}
                    articleCount={source.count}
                  />
                ))}
            </div>
          </>
        )}

        {!mounted && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-lg animate-pulse dark:bg-slate-800"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
