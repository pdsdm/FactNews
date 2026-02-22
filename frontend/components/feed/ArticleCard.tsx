"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SOURCE_COLORS } from "@/lib/constants";
import type { Article } from "@/lib/types";

interface ArticleCardProps {
  article: Article;
  hero?: boolean;
}

function readTime(contentLength: number): string {
  const words = contentLength / 5;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function ArticleCard({ article, hero = false }: ArticleCardProps) {
  const colors = SOURCE_COLORS[article.source] ?? {
    bar: "bg-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/60",
  };

  const href = `/search?q=${encodeURIComponent(article.title)}`;

  return (
    <div
      className={`relative flex flex-col rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow ${colors.bg} ${hero ? "h-full" : ""}`}
    >
      {/* Color bar */}
      <div className={`w-full h-1 ${colors.bar}`} />

      <div className={`flex flex-col flex-1 p-4 ${hero ? "p-6" : ""}`}>
        {/* Source + date */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {article.source}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatDate(article.date)}
          </span>
        </div>

        {/* Headline */}
        <h2
          className={`font-bold text-slate-900 dark:text-slate-100 leading-snug flex-1 font-times-new-roman ${
            hero ? "text-2xl mb-4" : "text-base mb-3"
          }`}
        >
          {article.title}
        </h2>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {readTime(article.content_length)}
          </span>
          <Link
            href={href}
            className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
          >
            Fact-check
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
