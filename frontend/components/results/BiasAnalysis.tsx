"use client";

import { Shield } from "lucide-react";

interface BiasAnalysisProps {
  analysis: string;
}

export function BiasAnalysis({ analysis }: BiasAnalysisProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200 dark:from-purple-950/30 dark:to-indigo-950/30 dark:border-purple-800">
      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 dark:text-slate-100">
        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        Bias Analysis
      </h3>
      <p className="text-slate-700 leading-relaxed dark:text-slate-300">
        {analysis}
      </p>
    </div>
  );
}
