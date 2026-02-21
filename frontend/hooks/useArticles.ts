"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchArticles } from "@/lib/api";
import type { Article } from "@/lib/types";

const PAGE_SIZE = 100;

export function useArticles(source?: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const currentOffset = reset ? 0 : offset;
        const data = await fetchArticles({
          limit: PAGE_SIZE,
          offset: currentOffset,
          source: source || undefined,
        });
        setArticles((prev) =>
          reset ? data.articles : [...prev, ...data.articles],
        );
        setTotal(data.total);
        setOffset(currentOffset + data.articles.length);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load articles");
      } finally {
        setLoading(false);
      }
    },
    [source, offset],
  );

  // Reset and reload when source filter changes
  useEffect(() => {
    setArticles([]);
    setOffset(0);
    setLoading(true);
    setError(null);
    fetchArticles({ limit: PAGE_SIZE, offset: 0, source: source || undefined })
      .then((data) => {
        setArticles(data.articles);
        setTotal(data.total);
        setOffset(data.articles.length);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load articles"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const loadMore = () => load(false);
  const hasMore = articles.length < total;

  return { articles, total, loading, error, loadMore, hasMore };
}
