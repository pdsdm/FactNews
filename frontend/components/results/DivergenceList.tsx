"use client";

import { AlertCircle } from "lucide-react";
import type { Divergence } from "@/lib/types";
import { DivergenceCard } from "./DivergenceCard";

interface DivergenceListProps {
  divergences: Divergence[];
}

export function DivergenceList({ divergences }: DivergenceListProps) {
  if (!divergences.length) return null;

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2 dark:text-slate-100 font-times-new-roman">
        <AlertCircle className="w-6 h-6 text-amber-500" />
        Conflicting Reports
      </h3>
      <div className="space-y-4">
        {divergences.map((div, idx) => (
          <DivergenceCard key={idx} divergence={div} />
        ))}
      </div>
    </div>
  );
}
