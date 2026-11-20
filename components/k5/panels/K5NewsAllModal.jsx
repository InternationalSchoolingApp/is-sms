"use client";

import { CalendarDays, Clock, Newspaper, X } from "lucide-react";
import DOMPurify from "dompurify";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { EmptyNote } from "@/components/k5/panels/K5Drawer";
import { formatNewsDate, formatRelativeAgo } from "@/utils/newsFormat";

function Story({ article }) {
  const t = useTranslations("k5Panels.newsAll");
  const tNews = useTranslations("news");
  const locale = useDateFnsLocale();
  const readTime = article.readingTime || article.readTime;
  return (
    <article className="flex flex-col gap-3 border-b-[3px] border-k5-line pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 font-k5-display text-[22px] font-semibold leading-tight text-k5-ink">{article.title}</h3>
        {article.country && <span className="flex-none text-[13px] font-extrabold text-k5-mut">📍 {article.country}</span>}
      </div>

      {article.image && <OptimizedImage src={article.image} alt="" width={820} height={460} sizes="(max-width: 760px) 100vw, 720px" className="h-auto w-full rounded-[18px] object-cover" />}

      <div className="flex flex-wrap items-center gap-2.5 text-sm font-extrabold">
        <span className="flex items-center gap-1.5 text-k5-yi">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatNewsDate(article.publishDate, { locale })}
        </span>
        <span className="rounded-full bg-k5-yt px-2.5 py-0.5 text-xs font-black text-k5-yx">{formatRelativeAgo(article.publishDate, tNews)}</span>
        {readTime ? (
          <span className="ms-auto flex items-center gap-1.5 text-k5-mut">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t("readTime", { minutes: readTime })}
          </span>
        ) : null}
      </div>

      <div
        className="text-[15px] font-bold leading-relaxed text-k5-ink [&_a]:text-k5-acx [&_a]:underline [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || article.description || "") }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {article.sourceLogo ? (
            <OptimizedImage src={article.sourceLogo} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-k5-soft text-sm font-black text-k5-ink">{article.sourceName?.[0] || "?"}</span>
          )}
          <div className="flex flex-col text-sm leading-tight">
            <span className="font-extrabold text-k5-mut">{t("source")}</span>
            <span className="font-black text-k5-ink">{article.sourceName}</span>
          </div>
        </div>
        {article.sourceUrl && (
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[15px] font-black text-k5-acx hover:underline">
            {t("readFull")}
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * "Latest News" (legacy showNewsDataByIds) in the K–5 look: every story the "View all news" button acted on, one after another
 * in a single scrolling card. The colours are the look's tokens, so day, night and every theme follow.
 */
export function K5NewsAllModal({ articles, hasMore = false, loadingMore = false, onMore, onClose }) {
  const t = useTranslations("k5Panels.newsAll");
  const tc = useTranslations("common");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,16,34,0.55)] p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="flex max-h-[85vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[26px] border-[3px] border-k5-ink bg-k5-card text-k5-ink shadow-[0_6px_0_var(--k5-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-[#FFE59E] px-5 py-3.5 text-[#0B2447]">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#FFFFFF]">
            <Newspaper className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="m-0 min-w-0 flex-1 truncate font-k5-display text-xl font-semibold">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("actions.close")}
            className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-xl border-none bg-k5-red text-white shadow-[0_3px_0_#B91C1C]"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          {articles.length === 0 ? <EmptyNote>{t("empty")}</EmptyNote> : articles.map((article) => <Story key={article.id} article={article} />)}
          {/* Legacy "Next" (getNextNewsBtn): another page of ten stories while the last page was full. */}
          {hasMore && (
            <button
              type="button"
              onClick={onMore}
              disabled={loadingMore}
              className="min-h-12 cursor-pointer self-center rounded-full border-none bg-[#F2B705] px-6 font-k5-display text-base font-semibold text-[#0B2447] shadow-[0_4px_0_#8A6100] disabled:cursor-default disabled:opacity-60"
            >
              {loadingMore ? tc("status.loading") : t("loadMore")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
