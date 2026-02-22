"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  XCircle,
  Swords,
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
    dot: "#22c55e",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
    gradient: "from-green-500 to-emerald-600",
  },
  "Claude Haiku 4.5": {
    dot: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-600",
  },
  "Gemini 2.5 Flash": {
    dot: "#3b82f6",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    gradient: "from-blue-500 to-indigo-600",
  },
  "Grok 4.1 Fast": {
    dot: "#a855f7",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-400",
    gradient: "from-purple-500 to-violet-600",
  },
  "Mistral Large 3": {
    dot: "#f43f5e",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-400",
    gradient: "from-rose-500 to-pink-600",
  },
  "Gemini 2.0 Flash": {
    dot: "#0ea5e9",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-400",
    gradient: "from-sky-500 to-cyan-600",
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

/* ── Rating bar (horizontal stars) ─────────────────────────────────── */
function RatingBar({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-sm transition-all ${
              i < rating
                ? `bg-gradient-to-br ${color} shadow-sm`
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-slate-900 dark:text-white ml-1">
        {rating}
      </span>
    </div>
  );
}

/* ── Bar chart component ──────────────────────────────────────────── */
function BarChartSection({ models }: { models: ModelResult[] }) {
  const ok = models.filter((m) => m.status === "ok");
  if (ok.length === 0) return null;
  const maxRating = Math.max(...ok.map((m) => m.rating), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-slate-500" />
        Score Comparison
      </h3>

      <div className="space-y-3">
        {ok.map((m) => {
          const clr = getColor(m.model);
          const pct = (m.rating / maxRating) * 100;
          return (
            <div key={m.model_id} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-20 text-right truncate">
                {shortName(m.model)}
              </span>
              <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full bg-gradient-to-r ${clr.gradient} rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                  style={{ width: `${pct}%` }}
                >
                  <span className="text-[11px] font-bold text-white drop-shadow-sm">
                    {m.rating}/10
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 w-12 text-right tabular-nums">
                {m.latency_s}s
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          {ok.map((m) => (
            <span
              key={m.model_id}
              className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getColor(m.model).dot }}
              />
              {shortName(m.model)}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> = response time
        </span>
      </div>
    </div>
  );
}

/* ── Loading animation ─────────────────────────────────────────────── */
const LOADING_MODELS = [
  { name: "GPT-4o Mini", color: "#22c55e" },
  { name: "Claude Haiku", color: "#f59e0b" },
  { name: "Gemini 2.5", color: "#3b82f6" },
  { name: "Grok 4.1", color: "#a855f7" },
  { name: "Mistral 3", color: "#f43f5e" },
  { name: "Gemini 2.0", color: "#0ea5e9" },
];

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
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
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: m.color }}
              />
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
export default function ArenaPage() {
  const [newsItem, setNewsItem] = useState("");
  const [result, setResult] = useState<ArenaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const addArenaEntry = useSearchHistoryStore((s) => s.addArenaEntry);
  const addArenaBookmark = useBookmarkStore((s) => s.addArenaBookmark);
  const isArenaBookmarked = useBookmarkStore((s) => s.isArenaBookmarked);
  const removeArenaBookmark = useBookmarkStore((s) => s.removeArenaBookmark);
  const arenaBookmarks = useBookmarkStore((s) => s.arenaBookmarks);

  // Scroll to results when they arrive
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsItem.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setExpandedId(null);
    try {
      const res = await fetch(`${API}/api/ai-pulse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_item: newsItem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setResult(data);
      // Auto-save to history
      addArenaEntry(newsItem, data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the AI Arena.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
          <Swords className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight">
          LLM{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Arena
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-base">
          Six frontier models compete. An anonymous judge scores the truth.
        </p>
      </div>

      {/* ── Input ───────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 mb-8">
        <form onSubmit={handleAnalyze} className="relative group">
          <textarea
            value={newsItem}
            onChange={(e) => setNewsItem(e.target.value)}
            placeholder="Enter a claim, question, or topic to analyze…"
            rows={2}
            className="w-full px-5 py-4 pr-28 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/20"
          />
          <button
            type="submit"
            disabled={loading || !newsItem.trim()}
            className="absolute right-2.5 bottom-2.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/25"
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
        <div className="max-w-2xl mx-auto px-6 mb-6">
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
        <div ref={resultsRef} className="max-w-4xl mx-auto px-6 space-y-6">
          {/* Podium: top 3 */}
          {result.models.filter((m) => m.status === "ok").length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-2">
              {/* 2nd place */}
              {(() => {
                const m = result.models.filter((x) => x.status === "ok")[1];
                const clr = getColor(m.model);
                return (
                  <div className="flex flex-col items-center w-28">
                    <Medal className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {shortName(m.model)}
                    </span>
                    <div
                      className={`w-full h-16 rounded-t-xl bg-gradient-to-b ${clr.gradient} opacity-80 flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-lg">
                        {m.rating}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {/* 1st place */}
              {(() => {
                const m = result.models.filter((x) => x.status === "ok")[0];
                const clr = getColor(m.model);
                return (
                  <div className="flex flex-col items-center w-32">
                    <Crown className="w-6 h-6 text-amber-500 mb-1" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                      {shortName(m.model)}
                    </span>
                    <div
                      className={`w-full h-24 rounded-t-xl bg-gradient-to-b ${clr.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <span className="text-white font-bold text-2xl">
                        {m.rating}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {/* 3rd place */}
              {(() => {
                const m = result.models.filter((x) => x.status === "ok")[2];
                const clr = getColor(m.model);
                return (
                  <div className="flex flex-col items-center w-28">
                    <Medal className="w-5 h-5 text-amber-700 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {shortName(m.model)}
                    </span>
                    <div
                      className={`w-full h-12 rounded-t-xl bg-gradient-to-b ${clr.gradient} opacity-70 flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-lg">
                        {m.rating}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Model answer cards */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Model Answers
              <span className="text-slate-400 font-normal normal-case">
                — {result.meta.succeeded}/{result.meta.total} responded
              </span>
            </h3>

            <div className="space-y-3">
              {result.models.map((m, idx) => {
                const clr = getColor(m.model);
                const isBest = m.model === result.judge.best;
                const isWorst = m.model === result.judge.worst;
                const isExpanded = expandedId === m.model_id;
                const answerLong = (m.answer?.length || 0) > 280;

                return (
                  <div
                    key={m.model_id}
                    className={`bg-white border rounded-xl overflow-hidden transition-all dark:bg-slate-900 ${
                      isBest
                        ? "border-emerald-300 shadow-emerald-100 shadow-md dark:border-emerald-700 dark:shadow-emerald-900/20"
                        : isWorst
                          ? "border-rose-200 dark:border-rose-800"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Rank badge */}
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${clr.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                      >
                        <span className="text-white font-bold text-sm">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                            {m.model}
                          </span>
                          {isBest && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold dark:bg-emerald-900/40 dark:text-emerald-400">
                              <Crown className="w-2.5 h-2.5" /> BEST
                            </span>
                          )}
                          {isWorst && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-semibold dark:bg-rose-900/40 dark:text-rose-400">
                              <ThumbsDown className="w-2.5 h-2.5" /> WORST
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RatingBar rating={m.rating} color={clr.gradient} />
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
                            <Clock className="w-3 h-3" />
                            {m.latency_s}s
                          </span>
                        </div>
                      </div>

                      {/* Big score */}
                      <div className="flex items-center gap-0.5 pl-3 border-l border-slate-100 dark:border-slate-800">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                          {m.rating}
                        </span>
                      </div>
                    </div>

                    {/* Answer body */}
                    <div className="px-4 pb-4 pt-0">
                      {m.status === "ok" && m.answer ? (
                        <>
                          <p
                            className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${
                              !isExpanded && answerLong ? "line-clamp-3" : ""
                            }`}
                          >
                            {m.answer}
                          </p>
                          {answerLong && (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : m.model_id)
                              }
                              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium mt-1 transition-colors"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Swords className="w-5 h-5 text-white" />
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
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

          {/* Bar chart */}
          <BarChartSection models={result.models} />

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
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-emerald-700"
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
