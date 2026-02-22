import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SearchHistoryEntry,
  ArenaHistoryEntry,
  ArenaResponse,
  ConsensusResponse,
} from "@/lib/types";
import { SEARCH_HISTORY_MAX } from "@/lib/constants";
import { generateId } from "@/lib/utils";

interface SearchHistoryState {
  entries: SearchHistoryEntry[];
  arenaEntries: ArenaHistoryEntry[];

  addEntry: (
    query: string,
    response: ConsensusResponse | null,
    mode?: "fast" | "consensus",
  ) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  getEntry: (id: string) => SearchHistoryEntry | undefined;

  addArenaEntry: (query: string, response: ArenaResponse) => void;
  removeArenaEntry: (id: string) => void;
  clearArenaHistory: () => void;
  getArenaEntry: (id: string) => ArenaHistoryEntry | undefined;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      arenaEntries: [],

      addEntry: (query, response, mode) =>
        set((state) => ({
          entries: [
            {
              id: generateId(),
              query,
              timestamp: Date.now(),
              response,
              consensusScore: response?.consensus_score ?? null,
              factsCount: response?.facts.length ?? 0,
              mode: mode ?? (response?.mode === "fast" ? "fast" : "consensus"),
              type: "search" as const,
            },
            ...state.entries,
          ].slice(0, SEARCH_HISTORY_MAX),
        })),

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      clearHistory: () => set({ entries: [], arenaEntries: [] }),

      getEntry: (id) => get().entries.find((e) => e.id === id),

      addArenaEntry: (query, response) =>
        set((state) => ({
          arenaEntries: [
            {
              id: generateId(),
              query,
              timestamp: Date.now(),
              response,
              bestModel: response.judge.best,
              worstModel: response.judge.worst,
              modelsCount: response.meta.succeeded,
            },
            ...state.arenaEntries,
          ].slice(0, SEARCH_HISTORY_MAX),
        })),

      removeArenaEntry: (id) =>
        set((state) => ({
          arenaEntries: state.arenaEntries.filter((e) => e.id !== id),
        })),

      clearArenaHistory: () => set({ arenaEntries: [] }),

      getArenaEntry: (id) => get().arenaEntries.find((e) => e.id === id),
    }),
    { name: "factnews-search-history" },
  ),
);
