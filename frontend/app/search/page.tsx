"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConsensus } from "@/hooks/useConsensus";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { HeroSection } from "@/components/search/HeroSection";
import { SearchBar } from "@/components/search/SearchBar";
import { StreamStatus } from "@/components/search/StreamStatus";
import { ErrorBanner } from "@/components/search/ErrorBanner";
import { ResultsContainer } from "@/components/results/ResultsContainer";

function SearchContent() {
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(searchParams.get("q") || "");
  const { response, loading, error, streamStatus, ask } = useConsensus();
  const addEntry = useSearchHistoryStore((s) => s.addEntry);
  const [submitted, setSubmitted] = useState(false);
  const [consensusMode, setConsensusMode] = useState(true);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !submitted) {
      setQuestion(q);
      setSubmitted(true);
      const mode = consensusMode ? "consensus" : "fast";
      ask(q, mode).then((result) => {
        if (result) addEntry(q, result, mode);
      });
    }
  }, [searchParams, submitted, ask, addEntry, consensusMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const mode = consensusMode ? "consensus" : "fast";
    const result = await ask(question, mode);
    addEntry(question, result, mode);
  };

  return (
    <div className="min-h-screen">
      {!response && <HeroSection />}

      <div className={`max-w-7xl mx-auto px-6 ${response ? "pt-8" : ""}`}>
        <SearchBar
          value={question}
          onChange={setQuestion}
          onSubmit={handleSubmit}
          loading={loading}
          consensusMode={consensusMode}
          onToggleMode={setConsensusMode}
        />
        <StreamStatus message={streamStatus} />
      </div>

      <ErrorBanner message={error} />

      {response && (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <ResultsContainer response={response} query={question} />
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
