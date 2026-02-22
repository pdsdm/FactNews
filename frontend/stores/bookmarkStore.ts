import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bookmark, ConsensusResponse, ArenaResponse } from "@/lib/types";
import { BOOKMARKS_MAX } from "@/lib/constants";
import { generateId } from "@/lib/utils";

export interface ArenaBookmark {
  id: string;
  query: string;
  response: ArenaResponse;
  savedAt: number;
  note?: string;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  arenaBookmarks: ArenaBookmark[];

  addBookmark: (
    query: string,
    response: ConsensusResponse,
    note?: string,
    mode?: "fast" | "consensus",
  ) => void;
  removeBookmark: (id: string) => void;
  removeByQuery: (query: string) => void;
  isBookmarked: (query: string) => boolean;
  getBookmark: (id: string) => Bookmark | undefined;

  addArenaBookmark: (
    query: string,
    response: ArenaResponse,
    note?: string,
  ) => void;
  removeArenaBookmark: (id: string) => void;
  isArenaBookmarked: (query: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      arenaBookmarks: [],

      addBookmark: (query, response, note, mode) =>
        set((state) => ({
          bookmarks: [
            {
              id: generateId(),
              query,
              response,
              savedAt: Date.now(),
              note,
              mode,
            },
            ...state.bookmarks,
          ].slice(0, BOOKMARKS_MAX),
        })),

      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),

      removeByQuery: (query) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.query !== query),
        })),

      isBookmarked: (query) => get().bookmarks.some((b) => b.query === query),

      getBookmark: (id) => get().bookmarks.find((b) => b.id === id),

      addArenaBookmark: (query, response, note) =>
        set((state) => ({
          arenaBookmarks: [
            {
              id: generateId(),
              query,
              response,
              savedAt: Date.now(),
              note,
            },
            ...state.arenaBookmarks,
          ].slice(0, BOOKMARKS_MAX),
        })),

      removeArenaBookmark: (id) =>
        set((state) => ({
          arenaBookmarks: state.arenaBookmarks.filter((b) => b.id !== id),
        })),

      isArenaBookmarked: (query) =>
        get().arenaBookmarks.some((b) => b.query === query),
    }),
    { name: "factnews-bookmarks" },
  ),
);
