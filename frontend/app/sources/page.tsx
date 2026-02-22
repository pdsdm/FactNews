"use client";

import { useState, useEffect, useCallback } from "react";
import { StatsOverview } from "@/components/dashboard/DashboardComponents";
import { SourceCard } from "@/components/sources/SourceCard";
import { getSources, addSource, removeSource } from "@/lib/api";
import { Plus, Loader2, AlertCircle } from "lucide-react";

interface SourceEntry {
  name: string;
  url: string;
  custom: boolean;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSources();
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    setAdding(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      const result = await addSource(newName.trim(), newUrl.trim());
      setAddSuccess(
        result.message ||
          `Added "${newName}" — ${result.articles_added ?? 0} articles scraped.`,
      );
      setNewName("");
      setNewUrl("");
      setShowForm(false);
      await loadSources();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (name: string) => {
    try {
      await removeSource(name);
      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove source");
    }
  };

  const builtIn = sources.filter((s) => !s.custom);
  const custom = sources.filter((s) => s.custom);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Sources
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage news outlets tracked by the system
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setAddError(null);
              setAddSuccess(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>

        <StatsOverview />

        {/* Add source form */}
        {showForm && (
          <div className="mb-8 p-5 bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">
              Add a new news source
            </h3>
            <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">
              Enter the name and RSS feed URL of a valid newspaper. The system
              will scrape articles, save them, and embed them for search.
            </p>
            <form onSubmit={handleAdd} className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Source name (e.g. The Washington Post)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                disabled={adding}
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="RSS Feed URL (e.g. https://feeds.washingtonpost.com/rss/world)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                disabled={adding}
              />
              {addError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {addError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={adding || !newName.trim() || !newUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {adding ? "Scraping articles..." : "Add & Scrape"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success banner */}
        {addSuccess && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
            {addSuccess}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-900 mb-3 dark:text-slate-100">
              Built-in Sources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
              {builtIn.map((source) => (
                <SourceCard
                  key={source.name}
                  name={source.name}
                  rssUrl={source.url}
                />
              ))}
            </div>

            {custom.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 mb-3 dark:text-slate-100">
                  Your Sources
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
                  {custom.map((source) => (
                    <SourceCard
                      key={source.name}
                      name={source.name}
                      rssUrl={source.url}
                      removable
                      onRemove={() => handleRemove(source.name)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
