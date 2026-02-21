"use client";

import { useState, useCallback } from "react";
import { refreshNews } from "@/lib/api";

export function useRefresh(onSuccess?: () => void) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshNews();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [onSuccess]);

  return { refreshing, error, refresh };
}
