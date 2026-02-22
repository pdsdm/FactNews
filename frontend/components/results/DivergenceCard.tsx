"use client";

import { ExternalLink } from "lucide-react";
import type { Divergence } from "@/lib/types";

interface DivergenceCardProps {
  divergence: Divergence;
}

export function DivergenceCard({ divergence }: DivergenceCardProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800">
      <h4 className="font-semibold text-slate-900 mb-3 dark:text-slate-100">
        {divergence.topic}
      </h4>
      <div className="space-y-3">
        {divergence.versions.map((version, i) => (
          <div
            key={i}
            className="bg-white/80 rounded-lg p-4 border border-amber-100 dark:bg-slate-800/80 dark:border-amber-900/50"
          >
            <div className="flex items-start gap-3">
              <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded dark:bg-amber-800/50 dark:text-amber-200">
                {version.source}
              </span>
              <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                {version.claim}
              </p>
              <a
                href={version.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
