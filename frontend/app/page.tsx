"use client";

import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  BarChart3,
  Shield,
} from "lucide-react";
import { basepath } from "./env";

const API = `http://${basepath}:8000`;

interface Fact {
  claim: string;
  sources: string[];
  source_names: string[];
  date?: string;
  confidence: string;
  evidence?: string;
  consensus: boolean;
}

interface Divergence {
  topic: string;
  versions: Array<{
    source: string;
    claim: string;
    url: string;
  }>;
}

interface Response {
  headline?: string;
  summary?: string;
  answer?: string;
  facts: Fact[];
  divergences?: Divergence[];
  bias_analysis?: string;
  consensus_score: number;
  coverage_quality?: string;
  chunks_used?: number;
  sources_analyzed?: number;
}

interface Stats {
  articles_indexed: number;
  chunks_created: number;
  sources: number;
  embeddings_ready: boolean;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>("");
  const [previewSources, setPreviewSources] = useState<number>(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/stats`);
      if (!res.ok) throw new Error(`Stats error: ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/refresh-news`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      alert(
        `News updated!\n✅ ${data.new_articles} new articles added\n📚 Total: ${data.total_articles} articles from ${data.sources_used} sources`,
      );
      await fetchStats();
    } catch (err) {
      console.error("Error refreshing news:", err);
      alert(`Error updating news: ${err instanceof Error ? err.message : err}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setResponse(null);
    setError(null);
    setSearchStatus("Searching for relevant sources...");
    setPreviewSources(0);

    try {
      // Phase 1: Quick search for chunks (no AI processing)
      const searchRes = await fetch(`${API}/ask/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const searchData = await searchRes.json();
      if (!searchRes.ok)
        throw new Error(searchData.detail || `Error ${searchRes.status}`);

      // Show preview
      setPreviewSources(searchData.sources_analyzed);
      setSearchStatus(
        `Found ${searchData.chunks_found} relevant articles from ${searchData.sources_analyzed} sources. Analyzing with AI...`,
      );

      // Phase 2: Full AI analysis (slower)
      const analysisRes = await fetch(`${API}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const analysisData = await analysisRes.json();
      if (!analysisRes.ok)
        throw new Error(analysisData.detail || `Error ${analysisRes.status}`);

      setResponse(analysisData);
      setSearchStatus("");
    } catch (err) {
      console.error("Error:", err);
      setError(
        err instanceof Error ? err.message : "Error connecting to backend.",
      );
      setSearchStatus("");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      high: "bg-emerald-100 text-emerald-700 border-emerald-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return styles[confidence as keyof typeof styles] || styles.medium;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Consensus Newsroom
                </h1>
                <p className="text-xs text-slate-500">
                  Multi-source fact verification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {stats && (
                <div className="hidden md:flex items-center gap-4 text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {stats.chunks_created || stats.articles_indexed} chunks
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{stats.sources} sources</span>
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!response && (
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            Powered by Chunk-level RAG
          </div>
          <h2 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Verify facts across
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              multiple news sources
            </span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            Get consensus-based answers backed by evidence from top news
            outlets. Detect bias, find truth.
          </p>
        </div>
      )}

      {/* Search Bar */}
      <div className={`max-w-4xl mx-auto px-6 ${response ? "pt-8" : ""}`}>
        <form onSubmit={handleAsk} className="relative">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about any recent news event..."
              className="w-full pl-14 pr-32 py-5 text-lg border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white shadow-sm"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  Search
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Search Status Indicator */}
        {searchStatus && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-blue-900 font-medium">{searchStatus}</p>
                {previewSources > 0 && (
                  <p className="text-sm text-blue-700 mt-1">
                    Analyzing content from {previewSources} sources...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-5xl mx-auto px-6 mt-6">
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Results */}
      {response && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* No Relevant Information Alert */}
          {response.facts.length === 0 ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-red-900 mb-2">
                No Relevant Information Found
              </h3>
              <p className="text-red-700 text-lg">
                The available sources do not contain information about this
                topic.
              </p>
            </div>
          ) : (
            <>
              {/* Metrics Bar */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      Consensus Score
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {response.facts.length === 0
                      ? "N/A"
                      : `${Math.round(response.consensus_score * 100)}%`}
                  </div>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width:
                          response.facts.length === 0
                            ? "0%"
                            : `${response.consensus_score * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      Sources Analyzed
                    </span>
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {response.sources_analyzed || response.chunks_used || 0}
                  </div>
                  <div className="mt-3 text-sm text-slate-500">
                    {response.facts.length === 0
                      ? "No relevant coverage"
                      : "From top outlets"}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      Coverage Quality
                    </span>
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                  </div>
                  <div
                    className={`text-3xl font-bold capitalize ${
                      response.coverage_quality === "low"
                        ? "text-amber-600"
                        : response.coverage_quality === "medium"
                          ? "text-blue-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {response.coverage_quality || "High"}
                  </div>
                  <div className="mt-3 text-sm text-slate-500">
                    {response.facts.length === 0
                      ? "Topic not covered"
                      : "Multi-source verified"}
                  </div>
                </div>
              </div>

              {/* Headline & Summary */}
              {response.headline && (
                <div className="bg-white rounded-2xl p-8 mb-6 border border-slate-200 shadow-sm">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">
                    {response.headline}
                  </h2>
                  {response.summary && (
                    <p className="text-lg text-slate-600 leading-relaxed">
                      {response.summary}
                    </p>
                  )}
                </div>
              )}

              {/* Answer fallback */}
              {response.answer && !response.headline && (
                <div className="bg-white rounded-2xl p-8 mb-6 border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    Answer
                  </h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {response.answer}
                  </p>
                </div>
              )}

              {/* Verified Facts */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  Verified Facts
                </h3>
                <div className="space-y-3">
                  {response.facts.map((fact, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium mb-3 leading-relaxed">
                            {fact.claim}
                          </p>

                          {fact.date && (
                            <p className="text-xs text-slate-500 mb-2">
                              📅{" "}
                              {new Date(fact.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          )}

                          {fact.evidence && (
                            <p className="text-sm italic text-slate-500 mb-3">
                              &ldquo;{fact.evidence}&rdquo;
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {fact.source_names && fact.source_names.length > 0
                              ? fact.source_names.map((name, i) => (
                                  <a
                                    key={i}
                                    href={fact.sources[i]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-full transition-colors"
                                  >
                                    {name}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))
                              : fact.sources.map((url, i) => (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-full transition-colors"
                                  >
                                    Source {i + 1}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceBadge(fact.confidence)}`}
                            >
                              {fact.confidence.toUpperCase()} CONFIDENCE
                            </span>
                            {fact.consensus && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                CONSENSUS
                              </span>
                            )}
                            {fact.consensus === false && (
                              <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                                Single source
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divergences */}
              {response.divergences && response.divergences.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                    Conflicting Reports
                  </h3>
                  <div className="space-y-4">
                    {response.divergences.map((div, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200"
                      >
                        <h4 className="font-semibold text-slate-900 mb-3">
                          {div.topic}
                        </h4>
                        <div className="space-y-3">
                          {div.versions.map((version, i) => (
                            <div
                              key={i}
                              className="bg-white/80 rounded-lg p-4 border border-amber-100"
                            >
                              <div className="flex items-start gap-3">
                                <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded">
                                  {version.source}
                                </span>
                                <p className="flex-1 text-sm text-slate-700">
                                  {version.claim}
                                </p>
                                <a
                                  href={version.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bias Analysis */}
              {response.bias_analysis && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Bias Analysis
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {response.bias_analysis}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
