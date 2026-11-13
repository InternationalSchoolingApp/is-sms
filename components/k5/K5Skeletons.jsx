import { Skeleton } from "@/components/ui/skeleton";
import { K5_CARD } from "@/components/k5/home/k5Bits";

/*
 * Loading placeholders of the Grade K–5 / Grade 6–8 dashboard, built on shadcn/ui Skeleton and shaped like the content
 * that is coming (cards, table rows, tiles), so the page does not jump when the data arrives. They use the K–5 tokens,
 * so they follow the student's look (colour, night mode) and the Middle skin; "reduce motion" stops the pulse.
 */

/** One placeholder block in the K–5 colours. */
export function K5Sk({ className = "", style }) {
  return <Skeleton aria-hidden="true" className={`bg-k5-line/70 ${className}`} style={style} />;
}

/** Announces "loading" to screen readers and marks the region busy; the blocks inside are hidden from them. */
export function K5Loading({ label = "Loading", className = "flex flex-col gap-4", children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** A row of number tiles (attendance, login history, performance…). */
export function K5TilesSkeleton({ count = 4, min = 200 }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${K5_CARD} flex items-center gap-3 px-4 py-3.5`}>
          <K5Sk className="h-12 w-12 flex-none rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2">
            <K5Sk className="h-3.5 w-3/4" />
            <K5Sk className="h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Course / club / certificate cards: icon, title, a line and two buttons. */
export function K5CardsSkeleton({ count = 4, min = 260, cols }) {
  const template = cols ? `repeat(${cols}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(${min}px, 1fr))`;
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: template }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${K5_CARD} flex flex-col gap-3.5 p-4`}>
          <div className="flex items-center gap-3">
            <K5Sk className="h-[60px] w-[60px] flex-none rounded-[18px]" />
            <div className="flex flex-1 flex-col gap-2">
              <K5Sk className="h-5 w-4/5" />
              <K5Sk className="h-3.5 w-1/2" />
            </div>
          </div>
          <K5Sk className="h-[52px] w-full rounded-full" />
          <K5Sk className="h-[52px] w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** The rows of a table (the header stays real); `cols` placeholder cells per row. */
export function K5RowsSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className={`grid items-center gap-4 border-t-2 border-k5-line px-3.5 py-3.5 ${r % 2 ? "bg-k5-soft" : "bg-k5-card"}`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <K5Sk key={c} className={`h-4 ${c === 0 ? "w-6" : c % 2 ? "w-4/5" : "w-3/5"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A whole table card: the "Show N entries" line, a header bar and rows. */
export function K5TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-4`}>
      <div className="flex items-center justify-between gap-3">
        <K5Sk className="h-[42px] w-44 rounded-xl" />
        <K5Sk className="h-4 w-40" />
      </div>
      <div className="overflow-hidden rounded-[18px] border-[3px] border-k5-line">
        <div className="h-14 bg-k5-ac/25" />
        <K5RowsSkeleton rows={rows} cols={cols} />
      </div>
    </div>
  );
}

/** A list of rows with an icon, two lines and a pill (modules, diary threads, requests). */
export function K5ListSkeleton({ rows = 4, card = false }) {
  const list = (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[18px] border-[3px] border-k5-line bg-k5-card px-3.5 py-3">
          <K5Sk className="h-11 w-11 flex-none rounded-[14px]" />
          <div className="flex flex-1 flex-col gap-2">
            <K5Sk className="h-4 w-3/5" />
            <K5Sk className="h-3 w-2/5" />
          </div>
          <K5Sk className="h-8 w-24 flex-none rounded-full" />
        </div>
      ))}
    </div>
  );
  return card ? <div className={`${K5_CARD} p-4`}>{list}</div> : list;
}

/** One big block (a chart, a report, a handbook), with a title line. */
export function K5BlockSkeleton({ height = 320, card = true }) {
  if (!card) return <K5Sk className="w-full rounded-[18px]" style={{ height }} />;
  return (
    <div className={`${K5_CARD} flex flex-col gap-3 p-5`}>
      <K5Sk className="h-6 w-1/3" />
      <K5Sk className="w-full rounded-[18px]" style={{ height }} />
    </div>
  );
}

/**
 * The day plan of the home page while it loads: the date tile with its title and status pills, a class card row (time on
 * the left) three times. The k5h-* classes are the same ones the real plan has, so Grade 9–12 sizes them like it.
 */
export function K5PlanSkeleton({ items = 3 }) {
  return (
    <K5Loading label="Loading your plan" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <K5Sk className="k5h-ptile h-[78px] w-[78px] flex-none rounded-[24px]" />
        <div className="flex flex-[1_1_200px] flex-col gap-2">
          <K5Sk className="k5h-ptitle h-8 w-56 max-w-full" />
          <K5Sk className="h-4 w-32" />
        </div>
        <div className="flex gap-2 max-[560px]:hidden">
          <K5Sk className="h-9 w-20 rounded-full" />
          <K5Sk className="h-9 w-20 rounded-full" />
          <K5Sk className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {Array.from({ length: items }, (_, i) => (
          <div key={i} className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3.5 max-[560px]:grid-cols-1">
            <K5Sk className="h-4 w-16 justify-self-end max-[560px]:justify-self-start" />
            <div className="flex flex-wrap items-center gap-4 rounded-[24px] border-[3px] border-k5-line px-[18px] py-3.5">
              <K5Sk className="k5h-stile h-[66px] w-[66px] flex-none rounded-[20px]" />
              <div className="flex flex-[1_1_220px] flex-col gap-2">
                <K5Sk className="h-5 w-24 rounded-full" />
                <K5Sk className="k5h-ctitle h-7 w-3/5" />
                <K5Sk className="h-4 w-2/5" />
                <span className="flex items-center gap-2">
                  <K5Sk className="h-[30px] w-[30px] rounded-full" />
                  <K5Sk className="h-4 w-28" />
                </span>
              </div>
              <K5Sk className="k5h-join h-[54px] w-32 flex-none rounded-full max-[560px]:hidden" />
            </div>
          </div>
        ))}
      </div>
    </K5Loading>
  );
}

/** The two left-column cards of the home page (Today, My Courses) while the plan loads. */
export function K5HomeLeftSkeleton() {
  return (
    <K5Loading label="Loading your day" className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-col gap-3 p-4`}>
        <K5Sk className="h-6 w-20" />
        <div className="flex items-center gap-3">
          <K5Sk className="h-11 w-11 flex-none rounded-[10px]" />
          <span className="flex flex-1 flex-col gap-2">
            <K5Sk className="h-4 w-28" />
            <K5Sk className="h-3.5 w-40 max-w-full" />
          </span>
        </div>
      </div>
      <div className={`${K5_CARD} flex flex-col gap-2 p-4`}>
        <K5Sk className="mb-1 h-6 w-32" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] px-2 py-1">
            <K5Sk className="k5h-ctile h-[38px] w-[38px] flex-none rounded-xl" />
            <K5Sk className="h-4 flex-1" />
            <K5Sk className="k5h-cchk h-[26px] w-[26px] flex-none rounded-lg" />
          </div>
        ))}
      </div>
    </K5Loading>
  );
}

/** My Profile: the hero card, the section list and a grid of fields. */
export function K5ProfileSkeleton() {
  return (
    <K5Loading label="Loading your profile" className="flex flex-col gap-[18px]">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-[18px] px-[22px] py-[18px]`}>
        <K5Sk className="h-[88px] w-[88px] flex-none rounded-full" />
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
          <K5Sk className="h-9 w-2/3 max-w-[360px]" />
          <K5Sk className="h-5 w-64 max-w-full" />
          <K5Sk className="h-4 w-full max-w-[440px] rounded-full" />
        </div>
        <div className="flex gap-2.5">
          <K5Sk className="h-12 w-28 rounded-full" />
          <K5Sk className="h-12 w-36 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-[270px_minmax(0,1fr)] items-start gap-[18px] max-[900px]:grid-cols-1">
        <div className={`${K5_CARD} flex flex-col gap-1 p-2.5 max-[900px]:flex-row max-[900px]:overflow-hidden`}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex min-h-14 items-center gap-2.5 rounded-2xl px-2.5 py-1.5 max-[900px]:w-[200px] max-[900px]:flex-none">
              <K5Sk className="h-[30px] w-[30px] flex-none rounded-full" />
              <K5Sk className="h-4 flex-1" />
              <K5Sk className="h-[30px] w-[30px] flex-none rounded-full" />
            </div>
          ))}
        </div>
        <div className={`${K5_CARD} flex min-w-0 flex-col gap-4 px-[22px] py-5 max-[600px]:px-4`}>
          <div className="flex items-center gap-3">
            <K5Sk className="h-11 w-11 flex-none rounded-[14px]" />
            <K5Sk className="h-8 w-64 max-w-full" />
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-[18px] max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
            {Array.from({ length: 9 }, (_, i) => (
              <K5Sk key={i} className="h-[50px] w-full rounded-[14px]" />
            ))}
          </div>
          <div className="flex justify-between gap-2.5 border-t-2 border-k5-line pt-4">
            <K5Sk className="h-12 w-28 rounded-full" />
            <K5Sk className="h-12 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </K5Loading>
  );
}
