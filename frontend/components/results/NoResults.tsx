"use client";

import { AlertTriangle } from "lucide-react";

export function NoResults() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center dark:bg-slate-800/50 dark:border-slate-700">
      <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-3 dark:text-slate-500" />
      <h3 className="text-lg font-semibold text-slate-900 mb-1 dark:text-slate-100">
        No Relevant Information Found
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        The available sources do not contain information about this topic.
      </p>
    </div>
  );
}
