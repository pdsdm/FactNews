"use client";

import { useState } from "react";

interface Fact {
  claim: string;
  sources: string[];
  confidence: string;
}

interface ConsensusResponse {
  answer: string;
  facts: Fact[];
  consensus_score: number;
  articles_used?: number;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ConsensusResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
        <p className="text-center text-gray-600 mb-8">
          Pregunta cualquier cosa y obtén respuestas verificadas por múltiples
          fuentes
        </p>

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
                          📰 Fuente {idx + 1}
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
            🚀 <strong>FASE 2 - RAG + LLM Real</strong> | OpenAI GPT-4 analizando 10 artículos reales con embeddings.
            {response && response.articles_used && <span className="ml-2">📊 Usados: {response.articles_used} artículos</span>}
          </p>
        </div>
      </div>
    </main>
  );
}
