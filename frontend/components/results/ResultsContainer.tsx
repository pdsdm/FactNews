"use client";

import type { ConsensusResponse } from "@/lib/types";
import { NoResults } from "./NoResults";
import { MetricsBar } from "./MetricsBar";
import { HeadlineSummary } from "./HeadlineSummary";
import { FactList } from "./FactList";
import { DivergenceList } from "./DivergenceList";
import { BiasAnalysis } from "./BiasAnalysis";
import { BookmarkButton } from "@/components/common/BookmarkButton";

interface ResultsContainerProps {
  response: ConsensusResponse;
  query: string;
}

export function ResultsContainer({ response, query }: ResultsContainerProps) {
  if (response.facts.length === 0) {
    return <NoResults />;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <BookmarkButton query={query} response={response} />
      </div>
      <MetricsBar response={response} />
      <HeadlineSummary
        headline={response.headline}
        summary={response.summary}
        answer={response.answer}
      />
      <FactList facts={response.facts} />
      {response.divergences && response.divergences.length > 0 && (
        <DivergenceList divergences={response.divergences} />
      )}
      {response.bias_analysis && (
        <BiasAnalysis analysis={response.bias_analysis} />
      )}
    </>
  );
}
