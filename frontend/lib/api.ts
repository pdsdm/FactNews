import { basepath } from "@/app/env";
import type { Stats, ArticlesResponse, Suggestion, SearchPreviewResponse } from "./types";

const API = `http://${basepath}:8000`;

export async function askStream(question: string): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await fetch(`${API}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  return reader;
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API}/stats`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function fetchArticles(params: {
  limit?: number;
  offset?: number;
  source?: string;
}): Promise<ArticlesResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  if (params.source) searchParams.set("source", params.source);

  const res = await fetch(`${API}/articles?${searchParams}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function fetchSuggestions(limit = 5): Promise<Suggestion[]> {
  const res = await fetch(`${API}/suggestions?limit=${limit}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function refreshNews(): Promise<void> {
  const res = await fetch(`${API}/refresh`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }
}

export async function searchPreview(question: string): Promise<SearchPreviewResponse> {
  const res = await fetch(`${API}/search/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }
  return res.json();
}
