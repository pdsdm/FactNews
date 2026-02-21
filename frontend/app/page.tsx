"use client";

import { useState, useEffect } from "react";

interface Fact {
  claim: string;
  sources: string[];
  source_names?: string[];
  confidence: string;
  evidence?: string;
  consensus?: boolean;
}

interface Divergence {
  topic: string;
  versions: Array<{source: string; claim: string; url: string}>;
}

interface ConsensusResponse {
  headline?: string;
  summary?: string;
  answer?: string;
  facts: Fact[];
  divergences?: Divergence[];
  bias_analysis?: string;
  consensus_score: number;
  coverage_quality?: string;
  articles_used?: number;
  clusters_found?: number;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ConsensusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{ total_articles: number } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("http://localhost:8000/refresh-news", {
        method: "POST",
      });
      const data = await res.json();
      alert(
        `Noticias actualizadas!\n${data.total_articles} artículos de ${data.sources} fuentes`,
      );
      fetchStats();
    } catch (error) {
      console.error("Error:", error);
      alert("Error actualizando noticias");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("Error:", error);
      alert("Error conectando con el backend. ¿Está corriendo en puerto 8000?");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 border-green-500 text-green-800";
      case "medium":
        return "bg-yellow-100 border-yellow-500 text-yellow-800";
      case "low":
        return "bg-red-100 border-red-500 text-red-800";
      default:
        return "bg-gray-100 border-gray-500 text-gray-800";
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-2 text-gray-800">
          Consensus Newsroom
        </h1>
        <p className="text-center text-gray-600 mb-4">
          Pregunta cualquier cosa y obtén respuestas verificadas por múltiples
          fuentes
        </p>

        {/* Stats bar */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="bg-white px-4 py-2 rounded-lg shadow text-sm">
            {stats?.total_articles || 0} artículos
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg shadow text-sm font-medium disabled:opacity-50 transition"
          >
            {refreshing ? "Actualizando..." : "Actualizar Noticias"}
          </button>
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="¿Qué quieres saber sobre las noticias actuales?"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? "Buscando..." : "Preguntar"}
            </button>
          </div>
        </div>

        {/* Response */}
        {response && (
          <div className="space-y-6">
            {/* Respuesta principal */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Respuesta
              </h2>
              <p className="text-gray-700 text-lg">{response.answer}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Consenso:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${response.consensus_score * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(response.consensus_score * 100)}%
                </span>
              </div>
            </div>

            {/* Hechos verificados */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Hechos Verificados
              </h2>
              <div className="space-y-4">
                {response.facts.map((fact, index) => (
                  <div
                    key={index}
                    className={`border-l-4 p-4 rounded-r-lg ${getConfidenceColor(fact.confidence)}`}
                  >
                    <p className="font-medium mb-2">{fact.claim}</p>
                    <div className="flex flex-wrap gap-2">
                      {fact.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-white rounded border border-gray-300 hover:bg-gray-50 transition"
                        >
                          Fuente {idx + 1}
                        </a>
                      ))}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                          fact.confidence === "high"
                            ? "bg-green-200"
                            : fact.confidence === "medium"
                              ? "bg-yellow-200"
                              : "bg-red-200"
                        }`}
                      >
                        {fact.confidence === "high"
                          ? "Alta confianza"
                          : fact.confidence === "medium"
                            ? "Media confianza"
                            : "Baja confianza"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info FASE */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-800">
            🚀 <strong>FASE 3.5 - Full Scraping + Clustering + Bias Detection</strong> | 
            Artículos completos scrapeados + detección de sesgos + conexión entre noticias.
            {response && response.clusters_found && response.clusters_found > 1 && (
              <span className="ml-2">🔗 {response.clusters_found} historias relacionadas</span>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
