"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SourceCard } from "@/components/sources/SourceCard";
import {
  fetchSourcesCatalog,
  fetchSelectedSources,
  saveSelectedSources,
  type CatalogCountry,
} from "@/lib/api";
import {
  Loader2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const MAX_SOURCES = 20;

export default function SourcesPage() {
  const [catalog, setCatalog] = useState<CatalogCountry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedSelection, setSavedSelection] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catalogData, selectedData] = await Promise.all([
        fetchSourcesCatalog(),
        fetchSelectedSources(),
      ]);
      setCatalog(catalogData);
      const sel = new Set(selectedData);
      setSelected(sel);
      setSavedSelection(new Set(sel));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const hasChanges = useMemo(() => {
    if (selected.size !== savedSelection.size) return true;
    for (const s of selected) {
      if (!savedSelection.has(s)) return true;
    }
    return false;
  }, [selected, savedSelection]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        if (next.size >= MAX_SOURCES) return prev;
        next.add(name);
      }
      return next;
    });
  };

  const selectAllInCountry = (country: CatalogCountry) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const names = country.sources.map((s) => s.name);
      const allIn = names.every((n) => next.has(n));
      if (allIn) {
        names.forEach((n) => next.delete(n));
      } else {
        for (const n of names) {
          if (next.size >= MAX_SOURCES) break;
          next.add(n);
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      setError("Please select at least one source.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await saveSelectedSources(Array.from(selected));
      setSavedSelection(new Set(selected));
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sources");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelected(new Set(savedSelection));
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Sources
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pick up to {MAX_SOURCES} news outlets.{" "}
          <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
            {selected.size}/{MAX_SOURCES}
          </span>{" "}
          selected.
        </p>
      </div>

      {/* Banners */}
      {success && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-10">
          {catalog.map((country) => {
            const names = country.sources.map((s) => s.name);
            const allIn = names.every((n) => selected.has(n));

            return (
              <section key={country.code}>
                {/* Country label */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <span className="text-lg">{country.flag}</span>
                    {country.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => selectAllInCountry(country)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {allIn ? "Deselect all" : "Select all"}
                  </button>
                </div>

                {/* Source chips */}
                <div className="flex flex-wrap gap-2">
                  {country.sources.map((src) => (
                    <SourceCard
                      key={src.name}
                      name={src.name}
                      selected={selected.has(src.name)}
                      onToggle={() => toggle(src.name)}
                      disabled={
                        !selected.has(src.name) && selected.size >= MAX_SOURCES
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Sticky save bar */}
      {!loading && hasChanges && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/80 backdrop-blur-lg dark:bg-slate-900/80 dark:border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-600 font-medium dark:text-amber-400">
              Unsaved changes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scraping…
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
