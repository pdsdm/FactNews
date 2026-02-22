"use client";

import { useState, useCallback } from "react";
import { searchPreview } from "@/lib/api";
import type { SearchPreviewResponse } from "@/lib/types";

export function useSearchPreview() {
  const [preview, setPreview] = useState<SearchPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchPreview(question);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { preview, loading, error, search, reset };
}
