"use client";

import { CheckCircle2 } from "lucide-react";

interface ConsensusBadgeProps {
  consensus: boolean | null;
}

export function ConsensusBadge({ consensus }: ConsensusBadgeProps) {
  if (consensus === true) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        CONSENSUS
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
      Single source
    </span>
  );
}
