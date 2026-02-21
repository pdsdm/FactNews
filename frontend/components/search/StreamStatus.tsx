"use client";

import { RefreshCw } from "lucide-react";

interface StreamStatusProps {
  message: string;
}

export function StreamStatus({ message }: StreamStatusProps) {
  if (!message) return null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
      <div className="flex items-center gap-3">
        <div className="relative">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin dark:text-blue-400" />
          <div className="absolute inset-0 bg-blue-400 blur-sm opacity-50 animate-pulse"></div>
        </div>
        <div className="flex-1">
          <p className="text-blue-900 font-medium dark:text-blue-200">
            {message}
          </p>
          <div className="mt-2 h-1 bg-blue-200 rounded-full overflow-hidden dark:bg-blue-800">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-progress"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
