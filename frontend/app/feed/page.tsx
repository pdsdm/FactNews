"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Newspaper,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
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

/* ── Feed Notice ───────────────────────────────────────────────────── */
type NoticeKind = "info" | "success" | "warning" | "alert";

const NOTICE_STYLES: Record<NoticeKind, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
  success:
    "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300",
  warning:
    "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
  alert:
    "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
};

const NOTICE_ICONS: Record<
  NoticeKind,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  alert: AlertCircle,
};

function FeedNotice({
  kind,
  message,
  action,
  onDismiss,
}: {
  kind: NoticeKind;
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}) {
  const Icon = NOTICE_ICONS[kind];
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${NOTICE_STYLES[kind]}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
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

  const headline = (article.headline ?? "").trim();
  const summary = (article.summary ?? "").trim();
  const bodyText = (article.body ?? "").trim();
  const category = (article.category ?? "Other").trim();
  const bodyParagraphs = bodyText.split("\n\n").filter(Boolean);
  const previewParas = hero
    ? bodyParagraphs.slice(0, 2)
    : bodyParagraphs.slice(0, 1);
  const hasMore = bodyParagraphs.length > previewParas.length;

  // Don't render if there's no headline at all
  if (!headline) return null;

  return (
    <article
      className={`group bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md ${
        hero ? "rounded-2xl p-6 md:p-8" : "rounded-xl p-5"
      }`}
    >
      {/* Category + sources */}
      <div className="flex items-center gap-2 mb-3">
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
        className={`font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 ${
          hero ? "text-2xl md:text-3xl" : "text-lg"
        }`}
      >
        {headline}
      </h2>

      {/* Summary */}
      {summary && (
        <p
          className={`text-slate-500 dark:text-slate-400 leading-relaxed mb-4 ${
            hero ? "text-base" : "text-sm"
          }`}
        >
          {summary}
        </p>
      )}

      {/* Body */}
      {bodyParagraphs.length > 0 && (
        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
          {(expanded ? bodyParagraphs : previewParas).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 flex-wrap">
          {(article.sources_referenced ?? []).slice(0, 4).map((src, i) => (
            <span
              key={`${src}-${i}`}
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
              router.push(`/search?q=${encodeURIComponent(headline)}`)
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
  const [refreshed, setRefreshed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set([...prev, id]));

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
      if (force) {
        setRefreshed(true);
        setDismissed(new Set()); // reset dismissals on fresh edition
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load edition");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Auto-dismiss "refreshed" notice after 4 s */
  useEffect(() => {
    if (!refreshed) return;
    const t = setTimeout(() => setRefreshed(false), 4000);
    return () => clearTimeout(t);
  }, [refreshed]);

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

  /* ── Compute feed notices ─────────────────────────────────────── */
  const ageMin = Math.floor(
    (Date.now() - new Date(edition.edition_time).getTime()) / 60_000,
  );
  const singleSourceCount = validArticles.filter(
    (a) => a.source_count === 1,
  ).length;
  const allMultiSource =
    validArticles.length > 0 && validArticles.every((a) => a.source_count >= 2);

  type NoticeEntry = {
    id: string;
    kind: NoticeKind;
    message: string;
    action?: { label: string; onClick: () => void };
    dismissable?: boolean;
  };

  const rawNotices: (NoticeEntry | false)[] = [
    refreshed && {
      id: "refreshed",
      kind: "success" as NoticeKind,
      message: `Edition refreshed — ${validArticles.length} stories compiled from ${edition.total_sources} sources.`,
    },
    !refreshed &&
      ageMin >= 10 && {
        id: "stale",
        kind: "info" as NoticeKind,
        message: `This edition is ${ageMin} minute${ageMin !== 1 ? "s" : ""} old. New coverage may be available.`,
        action: { label: "Refresh now", onClick: () => fetchEdition(true) },
        dismissable: true,
      },
    edition.total_sources < 5 && {
      id: "lowcoverage",
      kind: "warning" as NoticeKind,
      message: `Only ${edition.total_sources} news source${edition.total_sources !== 1 ? "s" : ""} are currently available. Coverage may be limited.`,
      dismissable: true,
    },
    allMultiSource && {
      id: "multisource",
      kind: "success" as NoticeKind,
      message: `All ${validArticles.length} stories in this edition are corroborated by multiple independent sources.`,
      dismissable: true,
    },
    !allMultiSource &&
      singleSourceCount > 0 && {
        id: "singlesource",
        kind: "warning" as NoticeKind,
        message: `${singleSourceCount} ${singleSourceCount === 1 ? "story has" : "stories have"} single-source coverage — verify independently before sharing.`,
        dismissable: true,
      },
  ];
  const notices = rawNotices.filter(
    (n): n is NoticeEntry => !!n && !dismissed.has(n.id),
  );

  return (
    <div className="min-h-screen pb-20">
      {/* ── Edition info bar ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Generated · Fact-Based · Multi-Source
            </div>
            <span className="text-xs text-slate-400">
              {formatEditionTime(edition.edition_time)} ·{" "}
              {edition.total_sources} sources · {edition.articles.length}{" "}
              stories
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {edition.generation_time_s}s
            </span>
            <button
              onClick={() => fetchEdition(true)}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Notices */}
        {notices.length > 0 && (
          <div className="space-y-2">
            {notices.map((n) => (
              <FeedNotice
                key={n.id}
                kind={n.kind}
                message={n.message}
                action={n.action}
                onDismiss={n.dismissable ? () => dismiss(n.id) : undefined}
              />
            ))}
          </div>
        )}

        {/* Hero article */}
        {hero && <ArticleCard article={hero} hero />}

        {/* ── Tier 2: Large left + stacked right ──────────────── */}
        {second && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                More Stories
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Story 2 — spans 2 columns */}
              <div className="xl:col-span-2">
                <ArticleCard article={second} hero />
              </div>

              {/* Stories 3 & 4 — stacked in 1 column */}
              {secondRight.length > 0 && (
                <div className="flex flex-col gap-4">
                  {secondRight.map((article, i) => (
                    <ArticleCard key={i} article={article} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tier 3: 3-column grid (remaining stories) ──────── */}
        {grid.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {grid.map((article, i) => (
              <ArticleCard key={i} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
