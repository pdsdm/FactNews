import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bookmark, ConsensusResponse } from "@/lib/types";
import { BOOKMARKS_MAX } from "@/lib/constants";
import { generateId } from "@/lib/utils";

interface BookmarkState {
  bookmarks: Bookmark[];
  addBookmark: (
    query: string,
    response: ConsensusResponse,
    note?: string,
  ) => void;
  removeBookmark: (id: string) => void;
  removeByQuery: (query: string) => void;
  isBookmarked: (query: string) => boolean;
  getBookmark: (id: string) => Bookmark | undefined;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (query, response, note) =>
        set((state) => ({
          bookmarks: [
            {
              id: generateId(),
              query,
              response,
              savedAt: Date.now(),
              note,
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
    }),
    { name: "factnews-bookmarks" },
  ),
);
