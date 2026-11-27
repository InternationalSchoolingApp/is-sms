"use client";

// DataTables "simple_numbers" window: up to 7 slots, ellipsis around the current page.
function pageSlots(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index);
  if (page < 4) return [0, 1, 2, 3, 4, "end-gap", pageCount - 1];
  if (page > pageCount - 5) return [0, "start-gap", ...Array.from({ length: 5 }, (_, index) => pageCount - 5 + index)];
  return [0, "start-gap", page - 1, page, page + 1, "end-gap", pageCount - 1];
}

/**
 * Legacy DataTables footer (dom 't<"... justify-content-between"i p>'):
 * "Showing X to Y of Z entries" on the left, Previous / numbers / Next on the right.
 * page is 0-based. `info(start, end, total)` replaces the left text when a page words it
 * differently (legacy language.info).
 */
export function TableFooter({ page, pageSize, total, onPageChange, info }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? page * pageSize + 1 : 0;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-5 text-sm text-black sm:flex-row sm:flex-wrap sm:justify-between sm:px-5 sm:text-base">
      <span>{info ? info(start, end, total) : `Showing ${start} to ${end} of ${total} entries`}</span>
      <div className="flex overflow-hidden rounded border border-slate-200">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-2 text-black/70 disabled:text-black/40 sm:px-4"
        >
          Previous
        </button>
        {/* Phones: the numbered window doesn't fit, show the current page instead. */}
        <span className="border-l border-slate-200 bg-primary px-3 py-2 text-white sm:hidden">
          {page + 1} / {pageCount}
        </span>
        {pageSlots(page, pageCount).map((slot) =>
          typeof slot === "string" ? (
            <span key={slot} className="hidden border-l border-slate-200 px-4 py-2 text-black/40 sm:block">
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              onClick={() => onPageChange(slot)}
              className={`hidden border-l border-slate-200 px-4 py-2 sm:block ${slot === page ? "bg-primary text-white" : "text-primary"}`}
            >
              {slot + 1}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="border-l border-slate-200 px-3 py-2 text-black/70 disabled:text-black/40 sm:px-4"
        >
          Next
        </button>
      </div>
    </div>
  );
}
