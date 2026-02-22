"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Search,
  Check,
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
  const [filter, setFilter] = useState("");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

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

  /* Filter logic */
  const filteredCatalog = useMemo(() => {
    let data = catalog;
    if (activeCountry) {
      data = data.filter((c) => c.code === activeCountry);
    }
    if (!filter.trim()) return data;
    const q = filter.toLowerCase();
    return data
      .map((country) => ({
        ...country,
        sources: country.sources.filter((s) =>
          s.name.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.sources.length > 0);
  }, [catalog, filter, activeCountry]);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-28">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-times-new-roman">
            Your Newsroom
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curate the outlets that power your feed. Select up to {MAX_SOURCES}.
          </p>
        </div>

        {/* Counter pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selected.size >= MAX_SOURCES
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <span className="tabular-nums text-lg font-bold">
              {selected.size}
            </span>
            <span className="text-slate-400 font-normal">/ {MAX_SOURCES}</span>
          </div>
        </div>
      </div>

      {
        /* Search + country tabs */
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter outlets…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveCountry(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                !activeCountry
                  ? "bg-slate-100 text-slate-900 border border-slate-300"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {catalog.map((c) => (
              <button
                key={c.code}
                onClick={() =>
                  setActiveCountry(activeCountry === c.code ? null : c.code)
                }
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCountry === c.code
                    ? "bg-slate-100 text-slate-900 border border-slate-300"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span>{c.flag}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      }
      {/* Banners */}
      {success && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
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
          {filteredCatalog.map((country) => {
            const names = country.sources.map((s) => s.name);
            const allIn = names.every((n) => selected.has(n));
            const someIn = names.some((n) => selected.has(n));

            return (
              <section key={country.code}>
                {/* Country header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="text-lg">{country.flag}</span>
                    {country.name}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      {names.filter((n) => selected.has(n)).length}/
                      {names.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => selectAllInCountry(country)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                      allIn
                        ? "text-red-600 hover:bg-red-50"
                        : someIn
                          ? "text-slate-600 hover:bg-slate-100"
                          : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {allIn ? "Remove all" : "Select all"}
                  </button>
                </div>

                {/* Source grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {country.sources.map((src) => {
                    const isSelected = selected.has(src.name);
                    const isDisabled =
                      !isSelected && selected.size >= MAX_SOURCES;

                    return (
                      <button
                        key={src.name}
                        onClick={() => toggle(src.name)}
                        disabled={isDisabled}
                        className={`relative flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-slate-100 text-slate-900 border-slate-300 shadow-sm"
                            : isDisabled
                              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        {/* Check indicator */}
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-colors ${
                            isSelected
                              ? "bg-slate-900"
                              : "border border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </span>
                        <span className="truncate">{src.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredCatalog.length === 0 && (
            <p className="text-center text-slate-400 py-12 text-sm">
              No outlets match your filter.
            </p>
          )}
        </div>
      )}

      {/* Sticky save bar */}
      {!loading && hasChanges && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-600 font-medium">
              Unsaved changes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scraping…
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save & Apply
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
