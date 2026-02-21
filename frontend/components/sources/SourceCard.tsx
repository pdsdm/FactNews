"use client";

import { X, Rss } from "lucide-react";

interface SourceCardProps {
  name: string;
  rssUrl?: string;
  removable?: boolean;
  onRemove?: () => void;
}

export function SourceCard({
  name,
  rssUrl,
  removable,
  onRemove,
}: SourceCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-blue-900/30">
          <Rss className="w-4 h-4 text-blue-700 dark:text-blue-300" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {name}
          </p>
          {rssUrl && (
            <p className="text-xs text-slate-400 truncate dark:text-slate-500">
              {rssUrl}
            </p>
          )}
        </div>
      </div>
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0 dark:hover:bg-red-950/30"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
