"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Loader2,
  XCircle,
  Users,
  Trophy,
  Clock,
  Star,
  Crown,
  ThumbsDown,
  Zap,
  BarChart3,
  Medal,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import Image from "next/image";
import { basepath } from "../env";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";

const API = `http://${basepath}:8000`;

/* ── Colours per model ─────────────────────────────────────────────── */
const MODEL_COLORS: Record<
  string,
  { dot: string; bg: string; border: string; text: string; gradient: string }
> = {
  "GPT-4o Mini": {
    dot: "#475569",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-600 to-slate-700",
  },
  "Claude Haiku 4.5": {
    dot: "#64748b",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-500 to-slate-600",
  },
  "Gemini 2.5 Flash": {
    dot: "#334155",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-700 to-slate-800",
  },
  "Grok 4.1 Fast": {
    dot: "#1e293b",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-800 to-slate-900",
  },
  "Mistral Large 3": {
    dot: "#0f172a",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-900 to-slate-950",
  },
  "Gemini 2.0 Flash": {
    dot: "#334155",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-700 to-slate-800",
  },
};

const DEFAULT_CLR = {
  dot: "#64748b",
  bg: "bg-slate-50 dark:bg-slate-800",
  border: "border-slate-200 dark:border-slate-700",
  text: "text-slate-700 dark:text-slate-400",
  gradient: "from-slate-500 to-slate-600",
};

function getColor(model: string) {
  return MODEL_COLORS[model] || DEFAULT_CLR;
}

function shortName(model: string) {
  return model
    .replace("Claude Haiku 4.5", "Claude")
    .replace("Gemini 2.5 Flash", "Gemini 2.5")
    .replace("Gemini 2.0 Flash", "Gemini 2.0")
    .replace("Grok 4.1 Fast", "Grok")
    .replace("Mistral Large 3", "Mistral")
    .replace("GPT-4o Mini", "GPT-4o");
}

/* ── Types ─────────────────────────────────────────────────────────── */
interface ModelResult {
  model: string;
  model_id: string;
  status: string;
  latency_s: number;
  rating: number;
  answer: string | null;
  error?: string;
}

interface JudgeResult {
  agreements?: string[];
  disagreements?: string[];
  verdict: string;
  best: string;
  worst: string;
  judge_model: string;
}

interface ArenaResponse {
  models: ModelResult[];
  judge: JudgeResult;
  meta: { succeeded: number; failed: number; total: number };
}

/* ── Rating bar (horizontal bars) ─────────────────────────────────── */
function RatingBar({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-sm transition-all ${
              i < rating
                ? "bg-slate-900 dark:bg-slate-100"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">
        {rating}/10
      </span>
    </div>
  );
}

/* ── Bar chart component ──────────────────────────────────────────── */
function BarChartSection({ judge }: { judge: JudgeResult }) {
  const agreements = judge.agreements || [];
  const disagreements = judge.disagreements || [];

  if (agreements.length === 0 && disagreements.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-slate-500" />
        Agreement & Disagreement
      </h3>

      {/* Agreements */}
      {agreements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Agreement ({agreements.length} points)
            </span>
          </div>
          <ul className="space-y-2 pl-4">
            {agreements.map((point, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
              >
                • {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disagreements */}
      {disagreements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Divergent views ({disagreements.length} points)
            </span>
          </div>
          <ul className="space-y-2 pl-4">
            {disagreements.map((point, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
              >
                • {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-center justify-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] text-slate-400">
          Analyzed by {judge.judge_model} judge
        </span>
      </div>
    </div>
  );
}

/* ── Loading animation ─────────────────────────────────────────────── */
const LOADING_MODELS = [
  { name: "GPT-4o Mini" },
  { name: "Claude Haiku" },
  { name: "Gemini 2.5" },
  { name: "Grok 4.1" },
  { name: "Mistral 3" },
  { name: "Gemini 2.0" },
];

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Loader2 className="w-4 h-4 animate-spin text-slate-900 dark:text-slate-100" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            6 models are thinking…
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {LOADING_MODELS.map((m, i) => (
          <div
            key={m.name}
            className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-slate-900 dark:border-slate-800"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-slate-400 dark:bg-slate-600" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {m.name}
              </span>
            </div>
            <div className="space-y-2 animate-pulse">
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full" />
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-4/5" />
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
function ArenaContent() {
  const searchParams = useSearchParams();
  const [newsItem, setNewsItem] = useState(searchParams.get("q") || "");
  const [result, setResult] = useState<ArenaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const addArenaEntry = useSearchHistoryStore((s) => s.addArenaEntry);
  const addArenaBookmark = useBookmarkStore((s) => s.addArenaBookmark);
  const isArenaBookmarked = useBookmarkStore((s) => s.isArenaBookmarked);
  const removeArenaBookmark = useBookmarkStore((s) => s.removeArenaBookmark);
  const arenaBookmarks = useBookmarkStore((s) => s.arenaBookmarks);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !submitted) {
      setSubmitted(true);
      handleAnalyzeWithQuery(q);
    }
  }, [searchParams, submitted]);

  const handleAnalyzeWithQuery = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setExpandedId(null);
    try {
      const res = await fetch(`${API}/api/ai-pulse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_item: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setResult(data);
      addArenaEntry(query, data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to ConsentAI.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Scroll to results when they arrive
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsItem.trim()) return;
    setSubmitted(true);
    await handleAnalyzeWithQuery(newsItem);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
        <Image
          src="/llm-council.png"
          alt="LLM Council"
          width={220}
          height={160}
          className="mx-auto mb-5"
          priority
        />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight font-times-new-roman">
          <span className="text-slate-800 dark:text-slate-300">Council</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-base">
          Six frontier models compete. An anonymous judge scores the truth.
        </p>
      </div>

      {/* ── Input ───────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 mb-8">
        <form
          onSubmit={handleAnalyze}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 shadow-sm transition-all focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/10 dark:bg-slate-900 dark:border-slate-700 dark:focus-within:border-slate-100 dark:focus-within:ring-slate-100/10"
        >
          <input
            type="text"
            value={newsItem}
            onChange={(e) => setNewsItem(e.target.value)}
            placeholder="Enter a claim, question, or topic to analyze…"
            className="flex-1 py-2 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !newsItem.trim()}
            className="flex-shrink-0 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all flex items-center gap-2 text-sm shadow-lg shadow-slate-900/25 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Analyze
              </>
            )}
          </button>
        </form>
        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" /> 6 models in parallel
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> ~5-10s total
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-6 mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-3 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* ── Results ─────────────────────────────────────────────── */}
      {result && (
        <div ref={resultsRef} className="max-w-7xl mx-auto px-6 space-y-6">
          {/* Model answer cards */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Model Responses
              <span className="text-slate-400 font-normal normal-case">
                — {result.meta.succeeded}/{result.meta.total} responded
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.models.map((m, idx) => {
                const isBest = m.model === result.judge.best;
                const isWorst = m.model === result.judge.worst;
                const isExpanded = expandedId === m.model_id;
                const answerLong = (m.answer?.length || 0) > 200;

                // Position-based colors
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const isThird = idx === 2;

                return (
                  <div
                    key={m.model_id}
                    className={`bg-white border-2 rounded-xl overflow-hidden transition-all flex flex-col dark:bg-slate-900 ${
                      isFirst
                        ? "border-yellow-400 shadow-yellow-100 shadow-md dark:border-yellow-500 dark:shadow-yellow-900/20"
                        : isSecond
                          ? "border-slate-400 shadow-slate-100 shadow-md dark:border-slate-500 dark:shadow-slate-800/20"
                          : isThird
                            ? "border-amber-600 shadow-amber-100 shadow-md dark:border-amber-700 dark:shadow-amber-900/20"
                            : isWorst
                              ? "border-red-400 shadow-red-100 shadow-md dark:border-red-600 dark:shadow-red-900/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {m.model}
                        </span>
                        <div className="flex items-center gap-1">
                          {isFirst && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-semibold dark:bg-yellow-900/40 dark:text-yellow-400">
                              <Crown className="w-2.5 h-2.5" /> 1ST
                            </span>
                          )}
                          {isSecond && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold dark:bg-slate-700 dark:text-slate-300">
                              2ND
                            </span>
                          )}
                          {isThird && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold dark:bg-amber-900/40 dark:text-amber-400">
                              3RD
                            </span>
                          )}
                          {isWorst && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-semibold dark:bg-red-900/40 dark:text-red-400">
                              <ThumbsDown className="w-2.5 h-2.5" /> WORST
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {m.rating}/10
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {m.latency_s}s
                        </span>
                      </div>
                    </div>

                    {/* Answer body */}
                    <div className="px-4 py-4 flex-1">
                      {m.status === "ok" && m.answer ? (
                        <>
                          <p
                            className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${
                              !isExpanded && answerLong ? "line-clamp-4" : ""
                            }`}
                          >
                            {m.answer}
                          </p>
                          {answerLong && (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : m.model_id)
                              }
                              className="text-xs text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300 font-medium mt-2 transition-colors"
                            >
                              {isExpanded ? "Show less" : "Read more…"}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <XCircle className="w-4 h-4" />
                          {m.error || "No response"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Judge Verdict */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:from-slate-900 dark:to-slate-900 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Judge Verdict
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                  Anonymous, randomly-selected LLM evaluated all answers
                </p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  {result.judge.verdict || "No verdict available."}
                </p>
                {(result.judge.best || result.judge.worst) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {result.judge.best && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">
                        <Crown className="w-3 h-3" />
                        Best: {result.judge.best}
                      </span>
                    )}
                    {result.judge.worst && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                        <ThumbsDown className="w-3 h-3" />
                        Worst: {result.judge.worst}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agreement & Disagreement Analysis */}
          <BarChartSection judge={result.judge} />

          {/* Bookmark button */}
          {(() => {
            const saved = isArenaBookmarked(newsItem);
            return (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={() => {
                    if (saved) {
                      const bm = arenaBookmarks.find(
                        (b) => b.query === newsItem,
                      );
                      if (bm) removeArenaBookmark(bm.id);
                    } else {
                      addArenaBookmark(newsItem, result);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                    saved
                      ? "bg-slate-200 text-slate-800 border border-slate-300 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-900 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-500"
                  }`}
                >
                  {saved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" /> Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" /> Save to Bookmarks
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default function ArenaPage() {
  return (
    <Suspense>
      <ArenaContent />
    </Suspense>
  );
}
