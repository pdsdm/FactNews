"use client";

import type { ConsensusResponse } from "@/lib/types";
import { NoResults } from "./NoResults";
import { MetricsBar } from "./MetricsBar";
import { HeadlineSummary } from "./HeadlineSummary";
import { FactList } from "./FactList";
import { DivergenceList } from "./DivergenceList";
import { BiasAnalysis } from "./BiasAnalysis";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { Zap, Users } from "lucide-react";

interface ResultsContainerProps {
  response: ConsensusResponse;
  query: string;
}

export function ResultsContainer({ response, query }: ResultsContainerProps) {
  if (response.facts.length === 0) {
    return <NoResults />;
  }

  const isFast = response.mode === "fast";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isFast
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          }`}
        >
          {isFast ? (
            <>
              <Zap className="w-3 h-3" />
              Fast AI (Cerebras)
            </>
          ) : (
            <>
              <Users className="w-3 h-3" />
              Consensus Council
            </>
          )}
        </div>
        <BookmarkButton query={query} response={response} />
      </div>
      <MetricsBar response={response} />
      <HeadlineSummary
        headline={response.headline}
        summary={response.summary}
        answer={response.answer}
      />
      <FactList facts={response.facts} mode={response.mode} />
      {response.divergences && response.divergences.length > 0 && (
        <DivergenceList divergences={response.divergences} />
      )}
      {response.bias_analysis && (
        <BiasAnalysis analysis={response.bias_analysis} />
      )}
    </>
  );
}
