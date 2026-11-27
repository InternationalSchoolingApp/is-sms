"use client";

import { useMemo, useState } from "react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { PdFooter } from "@/components/parent/pageParts/PdFooter";
import { PdHero } from "@/components/parent/pageParts/PdHero";
import { firstName } from "@/components/parent/childLabels";
import { useParentAssignedTeacher } from "@/hooks/parent/useParentAssignedTeacher";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { toTeacherRow } from "@/components/parent/teachers/teacherRows";

const PAGE_SIZE = 10;

// Subject icons / colours of the reference (Assigned Teachers cards).
const SIC = {
  sci: "M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10",
  math: "M7 4v6M4 7h6M14 7h6M5 15l4 4M9 15l-4 4M14 16h6M14 19h6",
  la: "M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5zM12 6v13.5",
  soc: "M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18",
  cs: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14",
  art: "M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z",
};
const SCOL = {
  la: ["#1D6FE8", "#E4EEFE"],
  sci: ["#13802B", "#E2F3E6"],
  art: ["#0E93CC", "#DFF3FC"],
  math: ["#B98200", "#FFF2CC"],
  cs: ["#D21F4C", "#FCE4EA"],
  soc: ["#7A4BD8", "#EFE8FD"],
};
function subjectKey(name) {
  const n = String(name).toLowerCase();
  if (/math/.test(n)) return "math";
  if (/computer/.test(n)) return "cs";
  if (/science/.test(n)) return "sci";
  if (/language/.test(n)) return "la";
  if (/social/.test(n)) return "soc";
  if (/art/.test(n)) return "art";
  return "la";
}
const initials = (name) => {
  const parts = String(name).replace(/^(Mr|Ms)\.\s*/, "").split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

/**
 * Parent > Assigned Teachers — legacy parentSyllabusAssignedTeacherContent.js: "Assigned Teachers" table of the
 * selected child's courses and teachers (S.No, Selected Courses, Assigned Teacher), 10 per page, empty state
 * "No assigned teacher found". The legacy parent page has no course-content popup, so none is built here.
 */
export function ParentAssignedTeachers() {
  const { selectedChild } = useSelectedChild();
  return (
    <ParentChildRequired>
      {/* Keyed by child: another child starts on page 1. */}
      <AssignedTeachersTable key={selectedChild?.userId} />
    </ParentChildRequired>
  );
}

function AssignedTeachersTable() {
  const { selectedChild } = useSelectedChild();
  const { isLoading, failed, sessionOut, rows: raw, retry } = useParentAssignedTeacher();
  const [page, setPage] = useState(0);

  const rows = useMemo(() => raw.map(toTeacherRow), [raw]);
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const status = isLoading
    ? "Loading…"
    : sessionOut
      ? "Your session has ended. Please sign in again."
      : failed
        ? "The assigned teachers could not be loaded."
        : rows.length === 0
          ? "No assigned teacher found"
          : null;

  const name = firstName(selectedChild?.studentName);
  const teacherCount = new Set(rows.map((row) => row.teacher).filter((teacher) => teacher !== "N/A")).size;
  const subtitle = status
    ? ""
    : `${rows.length} selected course${rows.length === 1 ? "" : "s"}${teacherCount ? ` \u00b7 ${teacherCount} teacher${teacherCount > 1 ? "s" : ""}` : ""}`;

  return (
    <section className="sch on" aria-label="Assigned teachers" aria-busy={isLoading}>
      <PdHero title={name ? `${name}\u2019s Assigned Teachers` : "Assigned Teachers"} subtitle={subtitle} />

      {status ? (
        <StatusText status={status} retry={failed && !sessionOut ? retry : null} />
      ) : (
        <>
          <div className="tc-grid">
            {pageRows.map((row, index) => {
              const [color, tint] = SCOL[subjectKey(row.course)];
              return (
                <article key={row.key} className="tc" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="tc-top">
                    <span className="tc-no" style={{ background: tint, color }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={SIC[subjectKey(row.course)]} />
                      </svg>
                    </span>
                    <b>{row.course}</b>
                  </div>
                  <div className="tc-t">
                    <span className="tc-av">{row.teacher === "N/A" ? "?" : initials(row.teacher)}</span>
                    <div>
                      <small>Assigned Teacher</small>
                      <b>{row.teacher}</b>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <PdFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onPageChange={setPage}
            info={(start, end, total) => `Showing ${start}\u2013${end} of ${total} entries`}
          />
        </>
      )}
    </section>
  );
}

function StatusText({ status, retry }) {
  return (
    <div className="sc-empty" role="status" style={{ marginTop: 16 }}>
      {status}
      {retry && (
        <>
          {" "}
          <button type="button" onClick={retry} style={{ color: "var(--brand)", textDecoration: "underline" }}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
