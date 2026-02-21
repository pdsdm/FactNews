"use client";

import { CategoryChips } from "./CategoryChips";

interface HeroSectionProps {
  onCategorySelect: (category: string) => void;
}

export function HeroSection({ onCategorySelect }: HeroSectionProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
      <h2 className="text-4xl font-bold text-slate-900 mb-4 leading-tight dark:text-slate-100">
        Verify facts across{" "}
        <span className="text-blue-600 dark:text-blue-400">
          multiple news sources
        </span>
      </h2>
      <p className="text-base text-slate-500 max-w-xl mx-auto dark:text-slate-400">
        Get consensus-based answers backed by evidence from top news outlets.
        Detect bias, find truth.
      </p>
      <CategoryChips onSelect={onCategorySelect} />
    </div>
  );
}
