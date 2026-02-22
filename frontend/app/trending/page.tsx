"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, Flame, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface TrendingTopic {
  title: string;
  source_count: number;
  article_count: number;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Politics: "text-red-600 bg-red-50",
  World: "text-blue-600 bg-blue-50",
  Economy: "text-amber-600 bg-amber-50",
  Technology: "text-violet-600 bg-violet-50",
  Science: "text-cyan-600 bg-cyan-50",
  Health: "text-emerald-600 bg-emerald-50",
  Sports: "text-orange-600 bg-orange-50",
  Entertainment: "text-pink-600 bg-pink-50",
};

export default function TrendingPage() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API ?? "http://localhost:8000"}/api/newspaper`,
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const trending: TrendingTopic[] = (data.articles ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => ({
          title: a.headline ?? "Untitled",
          source_count: a.source_count ?? 0,
          article_count: a.cluster_size ?? 0,
          category: a.category ?? "Other",
        }),
      );
      setTopics(trending);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10 pb-16">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900 font-times-new-roman">
            Trending Now
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Stories with the most coverage across multiple sources
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse h-16 bg-slate-100 rounded-xl"
            />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <p className="text-center text-slate-400 py-16">
          No trending topics yet. Check back later.
        </p>
      ) : (
        <div className="space-y-2">
          {topics.map((topic, i) => {
            const catStyle =
              CATEGORY_COLORS[topic.category] ?? "text-slate-600 bg-slate-50";
            return (
              <Link
                key={i}
                href={`/search?q=${encodeURIComponent(topic.title)}`}
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm hover:border-slate-300 transition-all group"
              >
                <span className="text-2xl font-black text-slate-200 w-8 text-right tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-blue-700 transition-colors">
                    {topic.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${catStyle}`}
                    >
                      {topic.category}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {topic.source_count} sources · {topic.article_count}{" "}
                      reports
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
