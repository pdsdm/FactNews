export interface Fact {
  claim: string;
  sources: string[];
  source_names: string[];
  date?: string;
  confidence: string;
  evidence?: string;
  consensus: boolean;
}

export interface Divergence {
  topic: string;
  versions: Array<{
    source: string;
    claim: string;
    url: string;
  }>;
}

export interface CouncilMeta {
  judge: string;
  providers_used: string[];
  providers_failed: string[];
  individual_responses: Record<string, string>;
}

export interface ConsensusResponse {
  status: string;
  headline?: string;
  summary?: string;
  answer?: string;
  facts: Fact[];
  divergences?: Divergence[];
  bias_analysis?: string;
  consensus_score: number;
  coverage_quality?: string;
  chunks_used?: number;
  sources_analyzed?: number;
  cached?: boolean;
  council_meta?: CouncilMeta;
  message?: string;
}

export interface Stats {
  articles_indexed: number;
  chunks_created: number;
  sources: number;
  embeddings_ready: boolean;
  cache_stats?: {
    response: { redis_cached?: number; memory_cached?: number };
    embeddings: { lru_cache?: { hit_rate?: number } };
  };
  metrics?: {
    requests_total: number;
    requests_cached: number;
    avg_response_time_ms: number;
  };
}

export interface Article {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
  content_length: number;
}

export interface ArticlesResponse {
  articles: Article[];
  total: number;
}

export interface Suggestion {
  title: string;
  chunks: number;
}

export type Theme = "light" | "dark" | "system";

export interface SearchPreviewResponse {
  chunks: Array<{
    chunk_id: string;
    text: string;
    source: string;
    title: string;
    date?: string;
    similarity: number;
  }>;
  sources_analyzed: number;
  chunks_used: number;
}

export interface Bookmark {
  id: string;
  query: string;
  response: ConsensusResponse;
  savedAt: number;
  note?: string;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  response: ConsensusResponse | null;
  consensusScore: number | null;
  factsCount: number;
}
