"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, RefreshCw, Search } from "lucide-react";
import { basepath } from "../env";

const API = `http://${basepath}:8000`;

/* ── Types ─────────────────────────────────────────────────────────── */
interface AIArticle {
  headline: string;
  summary: string;
  body: string;
  sources_referenced: string[];
  category: string;
  source_count: number;
  cluster_size: number;
  original_urls?: string[];
}

interface NewspaperEdition {
  edition_time: string;
  articles: AIArticle[];
  total_sources: number;
  generation_time_s: number;
}

/* ── Category colours ──────────────────────────────────────────────── */
const CAT_STYLES: Record<string, string> = {
  Politics: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  World: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Economy:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Technology:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Science: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Health:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Sports:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Entertainment:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function catClass(cat: string) {
  return CAT_STYLES[cat] || CAT_STYLES.Other;
}

/* ── Format helpers ────────────────────────────────────────────────── */
function formatEditionTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ── Loading skeleton ──────────────────────────────────────────────── */
function EditionSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="text-center space-y-3 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-64 mx-auto" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-48 mx-auto" />
      </div>
      {/* Hero article skeleton */}
      <div className="animate-pulse border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20 mb-4" />
        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-full mb-3" />
        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-5" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-2" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="animate-pulse border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-16 mb-3" />
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-4/5 mb-4" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full mb-1" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Article Card ──────────────────────────────────────────────────── */
type CardSize = "large" | "mid" | "small";

function ArticleCard({
  article,
  size = "small",
}: {
  article: AIArticle;
  size?: CardSize;
}) {
  const router = useRouter();

  const headline = (article.headline ?? "").trim();
  const summary = (article.summary ?? "").trim();
  const bodyText = (article.body ?? "").trim();
  const category = (article.category ?? "Other").trim();
  const bodyParagraphs = bodyText.split("\n\n").filter(Boolean);

  if (!headline) return null;

  const isLarge = size === "large";
  const isMid = size === "mid";

  const headlineClass = isLarge
    ? "text-2xl md:text-3xl line-clamp-3"
    : isMid
      ? "text-xl md:text-2xl line-clamp-2"
      : "text-base line-clamp-2";

  const summaryClamp = isLarge
    ? "line-clamp-3"
    : isMid
      ? "line-clamp-2"
      : "line-clamp-2";
  const bodyClamp = isLarge
    ? "line-clamp-[8]"
    : isMid
      ? "line-clamp-4"
      : "line-clamp-3";
  const srcLimit = isLarge ? 5 : 3;

  return (
    <article
      className={`group h-full flex flex-col bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md ${
        isLarge
          ? "rounded-2xl p-6 md:p-8"
          : isMid
            ? "rounded-xl p-5 md:p-6"
            : "rounded-xl p-4"
      }`}
    >
      {/* Category + sources */}
      <div className="flex items-center gap-2 mb-2">
        {category && (
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${catClass(category)}`}
          >
            {category}
          </span>
        )}
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {article.source_count} sources · {article.cluster_size} reports
        </span>
      </div>

      {/* Headline */}
      <h2
        className={`font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 font-times-new-roman ${headlineClass}`}
      >
        {headline}
      </h2>

      {/* Summary — justified */}
      {summary && (
        <p
          className={`text-justify text-slate-500 dark:text-slate-400 leading-relaxed mb-3 ${
            isLarge ? "text-base" : "text-sm"
          } ${summaryClamp}`}
        >
          {summary}
        </p>
      )}

      {/* Body — justified, clamped */}
      {bodyParagraphs.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <div
            className={`text-justify text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 ${bodyClamp}`}
          >
            {bodyParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Actions row — pinned to bottom */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 flex-wrap">
          {(article.sources_referenced ?? [])
            .slice(0, srcLimit)
            .map((src, i) => (
              <span
                key={`${src}-${i}`}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                {src}
              </span>
            ))}
          {(article.sources_referenced ?? []).length > srcLimit && (
            <span className="text-[10px] text-slate-400">
              +{(article.sources_referenced ?? []).length - srcLimit}
            </span>
          )}
        </div>

        <button
          onClick={() =>
            router.push(`/search?q=${encodeURIComponent(headline)}`)
          }
          className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
        >
          <Search className="w-3 h-3" />
          Fact-check
        </button>
      </div>
    </article>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function FeedPage() {
  const [edition, setEdition] = useState<NewspaperEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchEdition = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/newspaper${force ? "?force=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}`);
      }
      const data: NewspaperEdition = await res.json();
      setEdition(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load edition");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEdition();
  }, [fetchEdition]);

  /* Loading */
  if (loading && !edition) return <EditionSkeleton />;

  /* Error */
  if (error && !edition) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <Newspaper className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Could not generate today&apos;s edition.
        </p>
        <p className="text-xs text-red-500 mb-4">{error}</p>
        <button
          onClick={() => fetchEdition(true)}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!edition) return null;

  const validArticles = (edition.articles ?? []).filter(
    (a) => a && a.headline && a.body,
  );

  // Sort: best stories first (more sources + longer body)
  const sorted = [...validArticles].sort((a, b) => {
    const scoreA = (a.source_count || 0) * 2 + (a.body?.length || 0) / 100;
    const scoreB = (b.source_count || 0) * 2 + (b.body?.length || 0) / 100;
    return scoreB - scoreA;
  });

  // Tier layout: hero (1) · second tier (2-4) · grid (5+)
  const hero = sorted[0] ?? null;
  const second = sorted[1] ?? null;
  const secondRight = sorted.slice(2, 4);
  const grid = sorted.slice(4);

  return (
    <div className="min-h-screen pb-20">
      {/* ── Edition info bar ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <span className="text-xs text-slate-400">
            {formatEditionTime(edition.edition_time)} · {edition.total_sources}{" "}
            sources · {validArticles.length} stories
          </span>
          <button
            onClick={() => fetchEdition(true)}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Content: unified grid ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:auto-rows-[260px]">
          {/* Hero — 3 cols × 2 rows */}
          {hero && (
            <div className="xl:col-span-3 xl:row-span-2">
              <ArticleCard article={hero} size="large" />
            </div>
          )}

          {/* Story 2 — 2 cols × 2 rows */}
          {second && (
            <div className="xl:col-span-2 xl:row-span-2">
              <ArticleCard article={second} size="mid" />
            </div>
          )}

          {/* Stories 3+ — 1 col × 1 row each */}
          {[...secondRight, ...grid].map((article, i) => (
            <div key={i} className="xl:col-span-1 xl:row-span-1">
              <ArticleCard article={article} size="small" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
