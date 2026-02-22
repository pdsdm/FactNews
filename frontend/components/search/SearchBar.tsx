"use client";

import { Search, RefreshCw, ChevronRight, Zap, Users } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  consensusMode: boolean;
  onToggleMode: (consensus: boolean) => void;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  consensusMode,
  onToggleMode,
}: SearchBarProps) {
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ask about any recent news event..."
            className="w-full pl-14 pr-32 py-5 text-lg border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-100 dark:focus:ring-slate-100/10"
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center gap-2 shadow-lg shadow-slate-900/30 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                Search
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Consensus / Fast AI toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onToggleMode(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            !consensusMode
              ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shadow-sm"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Fast AI
        </button>

        <button
          type="button"
          onClick={() => onToggleMode(!consensusMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            consensusMode
              ? "bg-slate-900 dark:bg-slate-100"
              : "bg-slate-700 dark:bg-slate-500"
          }`}
          role="switch"
          aria-checked={consensusMode}
          aria-label="Toggle consensus mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              consensusMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => onToggleMode(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            consensusMode
              ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shadow-sm"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Consensus
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        {consensusMode
          ? "Multiple AI models deliberate to find consensus"
          : "Single Cerebras AI for fast analysis"}
      </p>
    </div>
  );
}
