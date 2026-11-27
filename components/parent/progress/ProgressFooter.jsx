"use client";

// Reference footer (.tc-ft + nav.pg) with the DataTables-style page window of ParentTableFooter.
function pageSlots(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index);
  if (page < 4) return [0, 1, 2, 3, 4, "end-gap", pageCount - 1];
  if (page > pageCount - 5) return [0, "start-gap", ...Array.from({ length: 5 }, (_, index) => pageCount - 5 + index)];
  return [0, "start-gap", page - 1, page, page + 1, "end-gap", pageCount - 1];
}

/** page is 0-based. */
export function ProgressFooter({ page, pageSize, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? page * pageSize + 1 : 0;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="tc-ft">
      <p>{`Showing ${start} to ${end} of ${total} entries`}</p>
      <nav className="pg" aria-label="Pages">
        <button type="button" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>
          Previous
        </button>
        {pageSlots(page, pageCount).map((slot) =>
          typeof slot === "string" ? (
            <span key={slot} className="pgr-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              className={slot === page ? undefined : "pgr-num"}
              aria-current={slot === page ? "page" : undefined}
              onClick={() => onPageChange(slot)}
            >
              {slot + 1}
            </button>
          ),
        )}
        <button type="button" onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}>
          Next
        </button>
      </nav>
    </div>
  );
}
