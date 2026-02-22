"use client";

import type { Fact } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/common/ConfidenceBadge";
import { ConsensusBadge } from "@/components/common/ConsensusBadge";
import { SourceLink } from "@/components/common/SourceLink";

interface FactCardProps {
  fact: Fact;
  index: number;
  showConsensus?: boolean;
}

export function FactCard({ fact, index, showConsensus = true }: FactCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-300">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-slate-900 font-medium mb-3 leading-relaxed dark:text-slate-100">
            {fact.claim}
          </p>

          {fact.date && (
            <p className="text-xs text-slate-500 mb-2 dark:text-slate-400">
              {formatDate(fact.date)}
            </p>
          )}

          {fact.evidence && (
            <p className="text-sm italic text-slate-500 mb-3 dark:text-slate-400">
              &ldquo;{fact.evidence}&rdquo;
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {fact.source_names && fact.source_names.length > 0
              ? fact.source_names.map((name, i) => (
                  <SourceLink key={i} name={name} url={fact.sources[i]} />
                ))
              : fact.sources.map((url, i) => (
                  <SourceLink key={i} name={`Source ${i + 1}`} url={url} />
                ))}
          </div>

          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={fact.confidence} />
            {showConsensus && <ConsensusBadge consensus={fact.consensus} />}
          </div>
        </div>
      </div>
    </div>
  );
}
