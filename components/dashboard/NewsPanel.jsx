"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Newspaper, X } from "lucide-react";
import { NewsDetailModal } from "@/components/dashboard/NewsDetailModal";
import { NewsAllModal } from "@/components/dashboard/NewsAllModal";
import { getArticlesByIds } from "@/services/newsApi";

function formatNewsDate(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}

/**
 * Slide-in news panel opened from the right action rail's Newspaper button
 * — same shell as AnnouncementsPanel. Shows the latest articles; clicking
 * one opens the full article via NewsDetailModal.
 */
export function NewsPanel({ articles, totalNews, userId, onClose }) {
  const [selected, setSelected] = useState(null);
  const [allArticles, setAllArticles] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const queryClient = useQueryClient();

  // Legacy's "View All News" (showNewsDataByIds): fetches the full detail
  // of every currently-listed article (get-article-by-ids also bulk-
  // acknowledges them as a side effect) and shows them stacked in one
  // modal, then hides the badge purely client-side — it's never
  // recomputed from the server, so it reappears with the full total on
  // the next page load. Mirrored here rather than inventing real
  // persistence the backend doesn't have.
  const handleViewAllNews = async () => {
    setMarkingAll(true);
    const result = await getArticlesByIds({ ids: articles.map((a) => a.id), userId });
    setMarkingAll(false);
    setAllArticles(result?.list || []);
    queryClient.setQueryData(["news-articles"], (data) => (data ? { ...data, totalNews: 0 } : data));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -left-4 cursor-pointer top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Newspaper className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-black">News</h2>
          {totalNews > 0 && <span className="ml-auto text-sm font-bold text-black/50">{totalNews} articles</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {articles.length === 0 ? (
            <p className="text-sm text-black/50">No news yet.</p>
          ) : (
            <ul className="space-y-3">
              {articles.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="flex w-full gap-3 rounded-lg border border-slate-100 p-2 text-left hover:border-primary hover:bg-primary/5"
                  >
                    {item.image && <img src={item.image} alt="" className="h-16 w-16 flex-shrink-0 rounded object-cover" />}
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-black">{item.title}</span>
                      <span className="mt-1 block text-xs text-black/50">
                        {item.sourceName} · {formatNewsDate(item.publishDate)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {articles.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={handleViewAllNews}
              disabled={markingAll}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {markingAll ? "Marking…" : "View All News"}
            </button>
          </div>
        )}
      </div>

      {selected && <NewsDetailModal article={selected} userId={userId} onClose={() => setSelected(null)} />}
      {allArticles && <NewsAllModal articles={allArticles} onClose={() => setAllArticles(null)} />}
    </div>
  );
}
