"use client";

import { useEffect, useState } from "react";
import { LucideCalendarDays, Newspaper, X } from "lucide-react";
import DOMPurify from "dompurify";
import { getArticleById } from "@/services/newsApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { formatNewsDate, formatRelativeAgo } from "@/utils/newsFormat";
import { OptimizedImage } from "@/components/common/OptimizedImage";

/**
 * Full article — re-fetched via get-article-by-id (the list endpoint only
 * returns a partial WebArticleDTO without description/content/readingTime).
 * Opening this also marks the article acknowledged server-side as a side
 * effect of that same call.
 */
export function NewsDetailModal({ article, userId, onClose }) {
  const [full, setFull] = useState(null);
  const dummy = useDummyStudent();

  useEffect(() => {
    let cancelled = false;
    // Dummy mode: legacy getDummyNewsById instead of get-article-by-id.
    const load = dummy.enabled ? Promise.resolve(dummy.student.newsById(article.id)) : getArticleById({ id: article.id, userId });
    load.then((result) => {
      if (!cancelled && result?.data) setFull(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [article.id, userId, dummy.enabled, dummy.student]);

  const data = full || article;
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

          {data.image && <OptimizedImage src={data.image} alt="" width={850} height={480} sizes="(max-width: 850px) 100vw, 850px" className="h-auto w-full object-cover" />}

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
              <LucideCalendarDays className="text-primary w-4 h-4" />
              {formatNewsDate(data.publishDate) && <span>{formatNewsDate(data.publishDate)}</span>}
              {formatRelativeAgo(data.publishDate) && (
                <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">{formatRelativeAgo(data.publishDate)}</span>
              )}
              {/* {(data.readingTime || data.readTime) && <span>{data.readingTime || data.readTime} min read</span>} */}
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
