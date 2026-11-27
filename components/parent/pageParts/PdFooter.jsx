"use client";
import "@/components/parent/pageParts/pageParts.css";

// Page window: up to 7 slots, gaps around the current page (page is 0-based).
function slots(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  if (page < 4) return [0, 1, 2, 3, 4, "end", count - 1];
  if (page > count - 5) return [0, "start", ...Array.from({ length: 5 }, (_, i) => count - 5 + i)];
  return [0, "start", page - 1, page, page + 1, "end", count - 1];
}

/** The reference's table footer (.tc-ft + nav.pg) driven by the same page / total / onPageChange as ParentTableFooter. */
export function PdFooter({ page, pageSize, total, onPageChange, info }) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? page * pageSize + 1 : 0;
  const end = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="tc-ft">
      <p>{info ? info(start, end, total) : `Showing ${start} to ${end} of ${total} entries`}</p>
      <nav className="pg" aria-label="Pages">
        <button type="button" disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
          Previous
        </button>
        {slots(page, count).map((slot) =>
          typeof slot === "string" ? (
            <span key={slot} aria-hidden="true">
              …
            </span>
          ) : (
            <button key={slot} type="button" aria-current={slot === page ? "page" : undefined} onClick={() => onPageChange(slot)}>
              {slot + 1}
            </button>
          ),
        )}
        <button type="button" disabled={page >= count - 1} onClick={() => onPageChange(Math.min(count - 1, page + 1))}>
          Next
        </button>
      </nav>
    </div>
  );
}
