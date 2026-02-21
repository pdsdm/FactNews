"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import type { ConsensusResponse } from "@/lib/types";

interface BookmarkButtonProps {
  query: string;
  response: ConsensusResponse;
}

export function BookmarkButton({ query, response }: BookmarkButtonProps) {
  const { isBookmarked, addBookmark, removeByQuery } = useBookmarkStore();
  const saved = isBookmarked(query);

  const toggle = () => {
    if (saved) {
      removeByQuery(query);
    } else {
      addBookmark(query, response);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        saved
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
      }`}
    >
      {saved ? (
        <>
          <BookmarkCheck className="w-4 h-4" />
          Saved
        </>
      ) : (
        <>
          <Bookmark className="w-4 h-4" />
          Save
        </>
      )}
    </button>
  );
}
