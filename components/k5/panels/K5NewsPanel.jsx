"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Newspaper } from "lucide-react";
import { NewsDetailModal } from "@/components/dashboard/NewsDetailModal";
import { NewsAllModal } from "@/components/dashboard/NewsAllModal";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { EmptyNote, K5Drawer } from "@/components/k5/panels/K5Drawer";
import { getArticlesByIds } from "@/services/newsApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

const PER_PAGE = 3;

function formatNewsDate(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}



/**
 * K–5 look of the News drawer (mockup "News"): big story cards, three per page with Back / Next.
 * "View all news" keeps the legacy behaviour (fetch every listed article, which also acknowledges
 * them, then clear the badge client-side only).
 */
export function K5NewsPanel({ articles, totalNews, userId, onClose }) {
  const [selected, setSelected] = useState(null);
  const [allArticles, setAllArticles] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(0);
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();

  const pages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const visible = articles.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  const handleViewAll = async () => {
    setMarkingAll(true);
    const result = dummy.enabled ? dummy.student.newsList() : await getArticlesByIds({ ids: articles.map((a) => a.id), userId });
    console.log("K5NewsPanel: view all news result", result);
    setMarkingAll(false);
    setAllArticles(result?.list || []);
    setSelected(!result?.list || []);
    console.log("K5NewsPanel: view all news articles", allArticles || []);
    queryClient.setQueriesData({ queryKey: ["news-articles"] }, (data) => (data ? { ...data, totalNews: 0 } : data));
  };

  

  const goTo = (next, el) => {
    if (next < 0 || next >= pages) return;
    setPage(next);
    el.closest("[role=dialog]")?.querySelector("[data-k5-drawer-body]")?.scrollTo({ top: 0 });
  };

  const navBtn = "min-h-11 cursor-pointer rounded-full border-[3px] border-[#F2B705] px-[18px] text-[15px] font-black text-[#0B2447] aria-disabled:cursor-default aria-disabled:opacity-45";

  return (
    <>
      {!selected && (
        <K5Drawer
          title="News"
          subtitle={totalNews > 0 ? `${totalNews} new` : "Fresh stories"}
          icon={<Newspaper className="h-[30px] w-[30px] text-[#0B2447]" aria-hidden="true" />}
          accent="#F2B705"
          pastel="#FFE59E"
          bg="var(--k5-card)"
          width={600}
          bodyClassName="px-4 pb-6 pt-[18px] overflow-y-auto"
          onClose={onClose}
        >
        {articles.length === 0 ? (
          <EmptyNote>No news yet.</EmptyNote>
        ) : (
          <>
            {visible.map((item) => (
              <article key={item.id} className="flex flex-col gap-3 rounded-3xl border-[3px] border-[#F2B705] bg-k5-card p-4 shadow-[0_4px_0_#F2B705]">
                <h3 className="m-0 font-k5-display text-[22px] font-semibold leading-tight text-k5-ink">{item.title}</h3>
                <div className="relative flex h-[210px] items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#FFF8D6_0%,#FFE27A_55%,#FFC94D_100%)]">
                  {item.image ? (
                    <OptimizedImage src={item.image} alt="" fill sizes="(max-width: 760px) 100vw, 560px" className="object-cover" />
                  ) : (
                    <Newspaper className="h-20 w-20 text-[#8A6100]" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-sm font-extrabold">
                  <span className="text-k5-yi">{formatNewsDate(item.publishDate)}</span>
                  {item.sourceName && <span className="text-k5-mut">{item.sourceName}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="min-h-11 w-fit cursor-pointer rounded-full border-none bg-[#F2B705] px-4 text-[15px] font-black text-[#0B2447] shadow-[0_3px_0_#8A6100]"
                >
                  Read the story
                </button>
              </article>
            ))}
            <nav aria-label="News pages" className="flex items-center justify-between gap-2.5 pt-1">
              <button type="button" aria-disabled={current === 0} onClick={(e) => goTo(current - 1, e.currentTarget)} className={`${navBtn} bg-k5-card text-k5-ink`}>
                Back
              </button>
              <span className="text-sm font-extrabold text-k5-mut">
                Page {current + 1} of {pages}
              </span>
              <button type="button" aria-disabled={current === pages - 1} onClick={(e) => goTo(current + 1, e.currentTarget)} className={`${navBtn} bg-[#F2B705] shadow-[0_4px_0_#8A6100]`}>
                Next
              </button>
            </nav>
            <button
              type="button"
              onClick={handleViewAll}
              disabled={markingAll}
              className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-4 text-base font-black text-k5-ink disabled:opacity-60"
            >
              {markingAll ? "Opening…" : "View all news"}
            </button>
          </>
        )}
        </K5Drawer>
      )}
      {selected && !allArticles && <NewsDetailModal article={selected} userId={userId} onClose={() => setSelected(null)} />}
      {allArticles && <NewsAllModal articles={allArticles} onClose={() => {setAllArticles(null); setSelected(null)}} />}
    </>
  );
}
