"use client";

import { getConfidenceBadge } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: string;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceBadge(confidence)}`}
    >
      {confidence.toUpperCase()} CONFIDENCE
    </span>
  );
}
