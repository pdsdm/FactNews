"use client";

interface SourceCardProps {
  name: string;
  articleCount: number;
}

export function SourceCard({ name, articleCount }: SourceCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">{name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {articleCount} article{articleCount !== 1 ? "s" : ""} referenced
        </p>
      </div>
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900/30">
        <span className="text-blue-700 font-bold text-sm dark:text-blue-300">
          {articleCount}
        </span>
      </div>
    </div>
  );
}
