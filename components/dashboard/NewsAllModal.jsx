"use client";

import { CalendarDays, Clock, Newspaper, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import DOMPurify from "dompurify";

function formatNewsDate(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}

// "1 year 10 months ago" / "3 months 10 days ago" style, matching the
// legacy "time ago" badge next to each article's date.
function formatRelativeAgo(value) {
  if (!value) return "";
  const date = parseISO(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const totalMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const totalDays = Math.floor(totalMinutes / (60 * 24));

  if (totalDays >= 365) {
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"} ago`;
  }
  if (totalDays >= 30) {
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    return `${months} month${months === 1 ? "" : "s"} ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (totalDays > 0) return `${totalDays} day${totalDays === 1 ? "" : "s"} ago`;
  return "today";
}

function ArticleBlock({ article }) {
  return (
    <div className="border-b border-slate-100 pb-6 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-black">{article.title}</h3>
        {article.country && <span className="flex-shrink-0 text-xs text-black/50">📍 {article.country}</span>}
      </div>

      {article.image && <img src={article.image} alt="" className="mt-3 w-full rounded-lg object-cover" />}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-black/60">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-primary" /> {formatNewsDate(article.publishDate)}
        </span>
        <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">{formatRelativeAgo(article.publishDate)}</span>
        {(article.readingTime || article.readTime) && (
          <span className="ml-auto flex items-center gap-1 font-semibold text-black">
            <Clock className="h-3.5 w-3.5" /> Read Time {article.readingTime || article.readTime} min
          </span>
        )}
      </div>

      <div
        className="mt-3 text-sm leading-relaxed text-black [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || article.description || "") }}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {article.sourceLogo ? (
            <img src={article.sourceLogo} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-bold">
              {article.sourceName?.[0] || "?"}
            </span>
          )}
          <div className="text-xs">
            <span className="block text-black/50">News Source</span>
            <span className="block font-bold text-black">{article.sourceName}</span>
          </div>
        </div>
        {article.sourceUrl && (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-primary hover:underline"
          >
            Read Full Article →
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * "Latest News" modal — legacy's showNewsDataByIds: the full detail of
 * every article the "View All News" button acted on, stacked one after
 * another in a single scrollable modal (not a separate page/view).
 */
export function NewsAllModal({ articles, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 bg-primary px-5 py-3">
          <Newspaper className="h-5 w-5 text-white" aria-hidden="true" />
          <h2 className="text-sm font-extrabold text-white">Latest News</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {articles.length === 0 ? (
            <p className="text-sm text-black/50">No news available.</p>
          ) : (
            articles.map((article) => <ArticleBlock key={article.id} article={article} />)
          )}
        </div>
      </div>
    </div>
  );
}
