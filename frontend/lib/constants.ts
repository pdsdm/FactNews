export const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: "Newspaper" },
  { href: "/search", label: "Search", icon: "Search" },
  { href: "/sources", label: "Sources", icon: "Globe" },
  { href: "/history", label: "History", icon: "History" },
  { href: "/bookmarks", label: "Bookmarks", icon: "Bookmark" },
] as const;

export const BOOKMARKS_MAX = 100;

export const SEARCH_CATEGORIES = [
  "Politics",
  "Technology",
  "Economy",
  "Health",
  "Science",
  "Climate",
  "Sports",
  "Entertainment",
];

export const SOURCE_COLORS: Record<string, { bar: string; bg: string }> = {
  BBC: { bar: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  CNN: { bar: "bg-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  Reuters: { bar: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  "The Guardian": { bar: "bg-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  "New York Times": { bar: "bg-gray-800", bg: "bg-gray-50 dark:bg-gray-900/30" },
  "Washington Post": { bar: "bg-gray-700", bg: "bg-gray-50 dark:bg-gray-900/30" },
  "Wall Street Journal": { bar: "bg-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  AP: { bar: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  NPR: { bar: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  Politico: { bar: "bg-blue-700", bg: "bg-blue-50 dark:bg-blue-950/30" },
  Axios: { bar: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  Bloomberg: { bar: "bg-black", bg: "bg-slate-50 dark:bg-slate-900/30" },
  "Financial Times": { bar: "bg-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  AlJazeera: { bar: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  "The Hill": { bar: "bg-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  TheVerge: { bar: "bg-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  Wired: { bar: "bg-gray-900", bg: "bg-gray-50 dark:bg-gray-900/30" },
  TechCrunch: { bar: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
  ArsTechnica: { bar: "bg-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  Engadget: { bar: "bg-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
};

export const SOURCE_FILTER_LABELS: Record<string, string> = {
  BBC: "BBC",
  CNN: "CNN",
  Reuters: "Reuters",
  "The Guardian": "Guardian",
  "New York Times": "NYT",
  "Washington Post": "WaPo",
  "Wall Street Journal": "WSJ",
  AP: "AP",
  NPR: "NPR",
  Politico: "Politico",
  Axios: "Axios",
  Bloomberg: "Bloomberg",
  "Financial Times": "FT",
  AlJazeera: "Al Jazeera",
  "The Hill": "The Hill",
  TheVerge: "Verge",
  Wired: "Wired",
  TechCrunch: "TC",
  ArsTechnica: "Ars",
  Engadget: "Engadget",
};
