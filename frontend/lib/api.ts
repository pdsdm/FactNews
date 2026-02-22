import { basepath } from "@/app/env";
import type {
  Stats,
  ArticlesResponse,
  Suggestion,
  SearchPreviewResponse,
} from "./types";

const API = `http://${basepath}:8000`;

export async function askStream(
  question: string,
  mode: "consensus" | "fast" = "consensus",
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await fetch(`${API}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode }),
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

export async function searchPreview(
  question: string,
): Promise<SearchPreviewResponse> {
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

export async function getSources(): Promise<
  { name: string; url: string; custom: boolean }[]
> {
  const res = await fetch(`${API}/sources`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.sources ?? data;
}

export async function addSource(
  name: string,
  url: string,
): Promise<{ message?: string; articles_added?: number }> {
  const res = await fetch(`${API}/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function removeSource(name: string): Promise<void> {
  const res = await fetch(`${API}/sources/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }
}

export interface CatalogSource {
  name: string;
  rss_url: string;
}

export interface CatalogCountry {
  code: string;
  name: string;
  flag: string;
  sources: CatalogSource[];
}

export async function fetchSourcesCatalog(): Promise<CatalogCountry[]> {
  const res = await fetch(`${API}/sources/catalog`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.countries;
}

export async function fetchSelectedSources(): Promise<string[]> {
  const res = await fetch(`${API}/sources/selected`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.selected;
}

export async function saveSelectedSources(
  sources: string[],
): Promise<{ status: string; message: string; selected: string[] }> {
  const res = await fetch(`${API}/sources/selected`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }
  return res.json();
}
