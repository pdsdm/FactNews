"use client";

import {
  Database,
  Layers,
  Globe,
  Zap,
  Search,
  ChevronRight,
  Cpu,
  Landmark,
  BarChart3,
  Briefcase,
  Rocket,
  ShieldCheck,
  HeartPulse,
  Map,
} from "lucide-react";
import Link from "next/link";
import { useStats } from "@/hooks/useStats";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { MetricCard } from "@/components/common/MetricCard";

export function StatsOverview() {
  const { stats } = useStats();

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard
        label="Articles Indexed"
        value={stats.articles_indexed}
        icon={<Database className="w-5 h-5 text-blue-500" />}
      />
      <MetricCard
        label="Facts Checked"
        value={stats.chunks_created}
        icon={<Layers className="w-5 h-5 text-indigo-500" />}
      />
      <MetricCard
        label="Sources"
        value={stats.sources}
        icon={<Globe className="w-5 h-5 text-emerald-500" />}
      />
      <MetricCard
        label="Embeddings"
        value={stats.embeddings_ready ? "Ready" : "Pending"}
        icon={<Zap className="w-5 h-5 text-amber-500" />}
        subtitle={
          stats.embeddings_ready ? "System operational" : "Generating..."
        }
      />
    </div>
  );
}

const topicIcons = {
  "AI regulation latest": Cpu,
  "Climate change policy updates": Globe,
  "Global economic outlook": BarChart3,
  "Tech industry layoffs": Briefcase,
  "Space exploration news": Rocket,
  "Cybersecurity threats": ShieldCheck,
  "Healthcare breakthroughs": HeartPulse,
  "Geopolitical tensions": Map,
} as const;

const topics = [
  "AI regulation latest",
  "Climate change policy updates",
  "Global economic outlook",
  "Tech industry layoffs",
  "Space exploration news",
  "Cybersecurity threats",
  "Healthcare breakthroughs",
  "Geopolitical tensions",
] as const;

export function SuggestedTopics() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-3 dark:text-slate-100">
        Explore Topics
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {topics.map((label) => {
          const Icon = topicIcons[label] || Landmark;
          return (
            <Link
              key={label}
              href={`/search?q=${encodeURIComponent(label)}`}
              className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600"
            >
              <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-700 truncate dark:text-slate-300">
                {label}
              </p>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors ml-auto flex-shrink-0 dark:text-slate-600" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function RecentSearches() {
  const entries = useSearchHistoryStore((s) => s.entries);

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-10 h-10 text-slate-300 mx-auto mb-3 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No recent searches yet
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Start Searching
        </Link>
      </div>
    );
  }

  const recent = entries.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recent Searches
        </h2>
        <Link
          href="/history"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400"
        >
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map((entry) => (
          <Link
            key={entry.id}
            href={`/topic/${entry.id}`}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
          >
            <div className="flex-1 min-w-0 mr-4">
              <p className="font-medium text-slate-900 truncate text-sm dark:text-slate-100">
                {entry.query}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                {new Date(entry.timestamp).toLocaleDateString()} &middot;{" "}
                {entry.factsCount} facts
              </p>
            </div>
            {entry.consensusScore !== null && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {Math.round(entry.consensusScore * 100)}%
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
