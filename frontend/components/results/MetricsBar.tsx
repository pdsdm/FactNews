"use client";

import { CheckCircle2, BarChart3, TrendingUp } from "lucide-react";
import type { ConsensusResponse } from "@/lib/types";
import { MetricCard } from "@/components/common/MetricCard";

interface MetricsBarProps {
  response: ConsensusResponse;
}

export function MetricsBar({ response }: MetricsBarProps) {
  const isFast = response.mode === "fast";
  const scorePercent = Math.round(response.consensus_score * 100);
  const coverageColor =
    response.coverage_quality === "low"
      ? "text-amber-600 dark:text-amber-400"
      : response.coverage_quality === "medium"
        ? "text-blue-600 dark:text-blue-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div
      className={`grid ${isFast ? "grid-cols-2" : "grid-cols-3"} gap-4 mb-8`}
    >
      {!isFast && (
        <MetricCard
          label="Consensus Score"
          value={response.facts.length === 0 ? "N/A" : `${scorePercent}%`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          progressValue={response.facts.length === 0 ? 0 : scorePercent}
          progressColor="from-emerald-500 to-green-500"
        />
      )}

      <MetricCard
        label="Sources Analyzed"
        value={response.sources_analyzed || response.chunks_used || 0}
        icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
        subtitle={
          response.facts.length === 0
            ? "No relevant coverage"
            : "From top outlets"
        }
      />

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Coverage Quality
          </span>
          <TrendingUp className="w-5 h-5 text-purple-500" />
        </div>
        <div className={`text-3xl font-bold capitalize ${coverageColor}`}>
          {response.coverage_quality || "High"}
        </div>
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {response.facts.length === 0
            ? "Topic not covered"
            : "Multi-source verified"}
        </div>
      </div>
    </div>
  );
}
