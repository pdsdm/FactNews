"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Newspaper,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
} from "lucide-react";
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
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
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
function ArticleCard({
  article,
  hero = false,
}: {
  article: AIArticle;
  hero?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const bodyParagraphs = (article.body ?? "").split("\n\n").filter(Boolean);
  const previewParas = hero
    ? bodyParagraphs.slice(0, 2)
    : bodyParagraphs.slice(0, 1);
  const hasMore = bodyParagraphs.length > previewParas.length;

  return (
    <article
      className={`group bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md ${
        hero ? "rounded-2xl p-6 md:p-8" : "rounded-xl p-5"
      }`}
    >
      {/* Category + sources */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${catClass(article.category)}`}
        >
          {article.category}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {article.source_count} sources · {article.cluster_size} reports
        </span>
      </div>

      {/* Headline */}
      <h2
        className={`font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 ${
          hero ? "text-2xl md:text-3xl" : "text-lg"
        }`}
      >
        {article.headline}
      </h2>

      {/* Summary */}
      <p
        className={`text-slate-500 dark:text-slate-400 leading-relaxed mb-4 ${
          hero ? "text-base" : "text-sm"
        }`}
      >
        {article.summary}
      </p>

      {/* Body */}
      <div
        className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 ${
          hero ? "" : ""
        }`}
      >
        {(expanded ? bodyParagraphs : previewParas).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 flex-wrap">
          {(article.sources_referenced ?? []).slice(0, 4).map((src) => (
            <span
              key={src}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {src}
            </span>
          ))}
          {(article.sources_referenced ?? []).length > 4 && (
            <span className="text-[10px] text-slate-400">
              +{(article.sources_referenced ?? []).length - 4}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {expanded ? (
                <>
                  Less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
          <button
            onClick={() =>
              router.push(`/search?q=${encodeURIComponent(article.headline)}`)
            }
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            <Search className="w-3 h-3" />
            Fact-check
          </button>
        </div>
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
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
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

  const [hero, ...rest] = edition.articles;

  return (
    <div className="min-h-screen pb-20">
      {/* ── Masthead ──────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-6">
        <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 pb-4 mb-1">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
              AI-Generated · Fact-Based · Multi-Source
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-serif">
            The FactNews Daily
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tracking-wide">
            {formatEditionTime(edition.edition_time)} · {edition.total_sources}{" "}
            sources analyzed · {edition.articles.length} stories
          </p>
        </div>

        {/* Refresh bar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" />
            Generated in {edition.generation_time_s}s
          </div>
          <button
            onClick={() => fetchEdition(true)}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh edition
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Hero article */}
        {hero && <ArticleCard article={hero} hero />}

        {/* Divider */}
        {rest.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              More Stories
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>
        )}

        {/* 2-col grid */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rest.map((article, i) => (
              <ArticleCard key={i} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
