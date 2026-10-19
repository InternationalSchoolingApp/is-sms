"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { LucideCalendarDays, Newspaper, X } from "lucide-react";
import DOMPurify from "dompurify";
import { getArticleById } from "@/services/newsApi";

function formatNewsDate(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}

/**
 * Full article — re-fetched via get-article-by-id (the list endpoint only
 * returns a partial WebArticleDTO without description/content/readingTime).
 * Opening this also marks the article acknowledged server-side as a side
 * effect of that same call.
 */
export function NewsDetailModal({ article, userId, onClose }) {
  const [full, setFull] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getArticleById({ id: article.id, userId }).then((result) => {
      if (!cancelled && result?.data) setFull(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [article.id, userId]);

  const data = full || article;
  console.log(data)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-[850px] h-8/8 rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className=" px-6 bg-white mb-4">
          <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-auto my-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>

          {data.image && <img src={data.image} alt="" className="w-full object-cover" />}

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
              <LucideCalendarDays className="text-primary w-4 h-4" />
              {formatNewsDate(data.publishDate) && <span>{formatNewsDate(data.publishDate)}</span>}
              {(data.readingTime || data.readTime) && <span>{data.readingTime || data.readTime} min read</span>}
            </div>
            <h2 className="text-lg font-bold text-black">{data.title}</h2>
            <div
              className="mt-3  text-sm leading-relaxed text-black [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content || data.description || "") }}
            />

            {data.sourceUrl && (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
              >
                View original source →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
