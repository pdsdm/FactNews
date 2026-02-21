"use client";

import { CheckCircle2 } from "lucide-react";
import type { Fact } from "@/lib/types";
import { FactCard } from "./FactCard";

interface FactListProps {
  facts: Fact[];
}

export function FactList({ facts }: FactListProps) {
  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2 dark:text-slate-100">
        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        Verified Facts
      </h3>
      <div className="space-y-3">
        {facts.map((fact, idx) => (
          <FactCard key={idx} fact={fact} index={idx} />
        ))}
      </div>
    </div>
  );
}
