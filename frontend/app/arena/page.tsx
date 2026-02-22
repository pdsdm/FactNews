"use client";

import { useState } from "react";
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
} from "lucide-react";
import { basepath } from "../env";

const API = `http://${basepath}:8000`;

/* ── Colours per model ─────────────────────────────────────────────── */
const MODEL_COLORS: Record<
  string,
  { dot: string; ring: string; bg: string; text: string }
> = {
  "GPT-4o Mini": {
    dot: "#22c55e",
    ring: "ring-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
  },
  "Claude Haiku 4.5": {
    dot: "#f59e0b",
    ring: "ring-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  "Gemini 2.5 Flash": {
    dot: "#3b82f6",
    ring: "ring-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  "Grok 4.1 Fast": {
    dot: "#a855f7",
    ring: "ring-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
  },
  "Mistral Large 3": {
    dot: "#f43f5e",
    ring: "ring-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-700 dark:text-rose-400",
  },
  "Gemini 2.0 Flash": {
    dot: "#0ea5e9",
    ring: "ring-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    text: "text-sky-700 dark:text-sky-400",
  },
};

const DEFAULT_CLR = {
  dot: "#64748b",
  ring: "ring-slate-400",
  bg: "bg-slate-50 dark:bg-slate-800",
  text: "text-slate-700 dark:text-slate-400",
};

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

/* ── Scatter chart (SVG) ──────────────────────────────────────────── */
function ScatterChart({ models }: { models: ModelResult[] }) {
  const ok = models.filter((m) => m.status === "ok" && m.answer);
  if (ok.length === 0) return null;

  const W = 520,
    H = 280,
    PAD = 52;
  const maxTime = Math.max(...ok.map((m) => m.latency_s), 1);
  const minTime = Math.min(...ok.map((m) => m.latency_s), 0);
  const timeRange = maxTime - minTime || 1;

  const x = (t: number) => PAD + ((t - minTime) / timeRange) * (W - PAD * 2);
  const y = (s: number) => H - PAD - ((s - 1) / 9) * (H - PAD * 2);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Speed vs Quality
      </h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px] mx-auto">
          {/* Grid lines */}
          {[1, 3, 5, 7, 9].map((s) => (
            <g key={s}>
              <line
                x1={PAD}
                y1={y(s)}
                x2={W - PAD}
                y2={y(s)}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth={0.5}
              />
              <text
                x={PAD - 8}
                y={y(s) + 4}
                textAnchor="end"
                className="fill-slate-400 dark:fill-slate-500"
                fontSize={10}
              >
                {s}
              </text>
            </g>
          ))}
          {/* Axes labels */}
          <text
            x={W / 2}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize={11}
            fontWeight={500}
          >
            Response time (s)
          </text>
          <text
            x={14}
            y={H / 2}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize={11}
            fontWeight={500}
            transform={`rotate(-90, 14, ${H / 2})`}
          >
            Score
          </text>
          {/* Time ticks */}
          {Array.from({ length: 5 }, (_, i) => {
            const t = minTime + (timeRange * i) / 4;
            return (
              <text
                key={i}
                x={x(t)}
                y={H - PAD + 18}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500"
                fontSize={10}
              >
                {t.toFixed(1)}s
              </text>
            );
          })}
          {/* Dots */}
          {ok.map((m) => {
            const clr = MODEL_COLORS[m.model]?.dot || DEFAULT_CLR.dot;
            const cx = x(m.latency_s);
            const cy = y(m.rating);
            return (
              <g key={m.model_id}>
                <circle cx={cx} cy={cy} r={8} fill={clr} opacity={0.85} />
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  className="fill-slate-700 dark:fill-slate-300"
                  fontSize={9}
                  fontWeight={600}
                >
                  {m.model
                    .replace("Claude Haiku 4.5", "Claude")
                    .replace("Gemini 2.5 Flash", "Gemini 2.5")
                    .replace("Gemini 2.0 Flash", "Gemini 2.0")
                    .replace("Grok 4.1 Fast", "Grok")
                    .replace("Mistral Large 3", "Mistral")
                    .replace("GPT-4o Mini", "GPT-4o")}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {ok.map((m) => {
          const clr = MODEL_COLORS[m.model]?.dot || DEFAULT_CLR.dot;
          return (
            <span
              key={m.model_id}
              className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: clr }}
              />
              {m.model}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Skeleton names ────────────────────────────────────────────────── */
const SKELETON_NAMES = [
  "GPT-4o Mini",
  "Claude Haiku",
  "Gemini Flash",
  "Grok 4.1",
  "Mistral 3",
  "Gemini 2.0",
];

/* ── Page ──────────────────────────────────────────────────────────── */
export default function ArenaPage() {
  const [newsItem, setNewsItem] = useState("");
  const [result, setResult] = useState<ArenaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsItem.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API}/api/ai-pulse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_item: newsItem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setResult(data);
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
    <div className="min-h-screen">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Swords className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            LLM Arena
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Six AI models answer independently. An anonymous judge scores them
            all.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleAnalyze} className="relative">
          <textarea
            value={newsItem}
            onChange={(e) => setNewsItem(e.target.value)}
            placeholder="Enter a claim, question, or topic to analyze..."
            rows={3}
            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !newsItem.trim()}
            className="absolute right-3 bottom-3 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Deliberating…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Analyze
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-3 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKELETON_NAMES.map((name) => (
              <div
                key={name}
                className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse dark:bg-slate-800 dark:border-slate-700"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-purple-400 animate-ping" />
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {name}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-full dark:bg-slate-700" />
                  <div className="h-3 bg-slate-100 rounded w-4/5 dark:bg-slate-700" />
                  <div className="h-3 bg-slate-100 rounded w-3/5 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="max-w-5xl mx-auto px-6 pb-16 space-y-8">
          {/* Model cards — sorted by rating */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Rankings ({result.meta.succeeded}/{result.meta.total} responded)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.models.map((m, idx) => {
                const clr = MODEL_COLORS[m.model] || DEFAULT_CLR;
                const isBest = m.model === result.judge.best;
                const isWorst = m.model === result.judge.worst;

                return (
                  <div
                    key={m.model_id}
                    className={`bg-white border rounded-2xl overflow-hidden transition-all hover:shadow-md dark:bg-slate-800 ${
                      isBest
                        ? "border-emerald-400 ring-2 ring-emerald-400/30 dark:border-emerald-500"
                        : isWorst
                          ? "border-rose-300 dark:border-rose-700"
                          : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {/* Header */}
                    <div
                      className={`px-5 py-3 flex items-center justify-between ${clr.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        {isBest && <Crown className="w-4 h-4 text-amber-500" />}
                        {isWorst && (
                          <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {idx + 1}. {m.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {m.rating}
                        </span>
                        <span className="text-xs text-slate-400">/10</span>
                      </div>
                    </div>

                    {/* Answer */}
                    <div className="px-5 py-4">
                      {m.status === "ok" && m.answer ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {m.answer}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          {m.error || "No response"}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.latency_s}s
                      </span>
                      <span className="font-mono">{m.model_id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Judge Verdict */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Swords className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Judge Verdict
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              An anonymous, randomly-selected LLM evaluated all answers.
            </p>
            <p className="text-slate-900 dark:text-slate-100 leading-relaxed">
              {result.judge.verdict || "No verdict available."}
            </p>
            {(result.judge.best || result.judge.worst) && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {result.judge.best && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                    <Crown className="w-3.5 h-3.5" /> Best: {result.judge.best}
                  </span>
                )}
                {result.judge.worst && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-sm font-medium text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
                    <ThumbsDown className="w-3.5 h-3.5" /> Worst:{" "}
                    {result.judge.worst}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Speed vs Quality chart */}
          <ScatterChart models={result.models} />
        </div>
      )}
    </div>
  );
}
