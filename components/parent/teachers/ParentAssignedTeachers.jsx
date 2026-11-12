"use client";

import { useMemo, useState } from "react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentTableFooter } from "@/components/parent/common/ParentTableFooter";
import { useParentAssignedTeacher } from "@/hooks/parent/useParentAssignedTeacher";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { toTeacherRow } from "@/components/parent/teachers/teacherRows";

const PAGE_SIZE = 10;
const HEADERS = ["S.No", "Selected Courses", "Assigned Teacher"];

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

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <h1 className="mb-3 ml-4 text-lg font-bold text-black sm:ml-5 sm:text-xl">Assigned Teachers</h1>

        {/* Phones: one card per course instead of the 3-column table. */}
        <div className="md:hidden" aria-busy={isLoading}>
          {status ? (
            <StatusText status={status} retry={failed && !sessionOut ? retry : null} />
          ) : (
            <ul className="space-y-3 px-4">
              {pageRows.map((row, index) => (
                <li key={row.key}>
                  <ParentMobileTableCard
                    rows={[
                      { label: HEADERS[0], value: page * PAGE_SIZE + index + 1 },
                      { label: HEADERS[1], value: row.course },
                      { label: HEADERS[2], value: row.teacher },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full whitespace-nowrap text-left text-sm text-black">
            <thead className="bg-primary text-white">
              <tr>
                {HEADERS.map((header, index) => (
                  <th key={header} className={`py-3 pr-3 font-normal ${index === 0 ? "pl-5" : "pl-3"}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {status ? (
                <tr>
                  <td colSpan={HEADERS.length}>
                    <StatusText status={status} retry={failed && !sessionOut ? retry : null} />
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <td className="py-3 pl-5 pr-3">{page * PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3">{row.course}</td>
                    <td className="px-3 py-3">{row.teacher}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!status && (
          <ParentTableFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onPageChange={setPage}
            info={(start, end, total) => `Showing ${start}-${end} of ${total} entries`}
          />
        )}
      </div>
    </div>
  );
}

function StatusText({ status, retry }) {
  return (
    <p className="py-8 text-center text-sm text-black/50" role="status">
      {status}
      {retry && (
        <>
          {" "}
          <button type="button" onClick={retry} className="text-primary underline">
            Try again
          </button>
        </>
      )}
    </p>
  );
}
