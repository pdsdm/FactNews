import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SearchHistoryEntry, ConsensusResponse } from "@/lib/types";
import { SEARCH_HISTORY_MAX } from "@/lib/constants";
import { generateId } from "@/lib/utils";

interface SearchHistoryState {
  entries: SearchHistoryEntry[];
  addEntry: (query: string, response: ConsensusResponse | null) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  getEntry: (id: string) => SearchHistoryEntry | undefined;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (query, response) =>
        set((state) => ({
          entries: [
            {
              id: generateId(),
              query,
              timestamp: Date.now(),
              response,
              consensusScore: response?.consensus_score ?? null,
              factsCount: response?.facts.length ?? 0,
            },
            ...state.entries,
          ].slice(0, SEARCH_HISTORY_MAX),
        })),

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      clearHistory: () => set({ entries: [] }),

      getEntry: (id) => get().entries.find((e) => e.id === id),
    }),
    { name: "factnews-search-history" },
  ),
);
