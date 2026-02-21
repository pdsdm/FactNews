"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !submitted) {
      setQuestion(q);
      setSubmitted(true);
      ask(q).then((result) => {
        if (result) addEntry(q, result);
      });
    }
  }, [searchParams, submitted, ask, addEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const result = await ask(question);
    addEntry(question, result);
  };

  const handleCategorySelect = useCallback(
    (category: string) => {
      setQuestion(category);
      ask(category).then((result) => {
        if (result) addEntry(category, result);
      });
    },
    [ask, addEntry],
  );

  return (
    <div className="min-h-screen">
      {!response && <HeroSection onCategorySelect={handleCategorySelect} />}

      <div className={`max-w-4xl mx-auto px-6 ${response ? "pt-8" : ""}`}>
        <SearchBar
          value={question}
          onChange={setQuestion}
          onSubmit={handleSubmit}
          loading={loading}
        />
        <StreamStatus message={streamStatus} />
      </div>

      <ErrorBanner message={error} />

      {response && (
        <div className="max-w-5xl mx-auto px-6 py-12">
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
