"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Clock, LogIn, LogOut, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentTableFooter } from "@/components/parent/common/ParentTableFooter";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useParentLoginHistory } from "@/hooks/parent/useParentLoginHistory";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;
const PAGE_SIZE = 10;
const HEADERS = ["S.No", "Log in Date | Time", "Log out Date | Time", "Location", "Duration"];

const TONES = {
  success: { badge: "bg-green-100 text-green-600", text: "text-green-600" },
  warning: { badge: "bg-amber-100 text-amber-500", text: "text-amber-500" },
  primary: { badge: "bg-primary/10 text-primary", text: "text-primary" },
};

function SummaryCard({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className="h-full rounded-[10px] border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-medium text-black">{label}</h2>
        <span className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${TONES[tone].badge}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mb-1 text-xl font-medium text-black">{value || "N/A"}</div>
      <div className={TONES[tone].text}>{sub || "N/A"}</div>
    </div>
  );
}

/**
 * Parent "Log in History" (pageLink parent-student-login-details), legacy studentParentLoginHistory.js: for the
 * selected child, the First / Last / Total log in cards, the "Log in Sessions" table with a search over every
 * column, and the security notice. The child tabs sit above (parent/layout.jsx). The legacy extra "Parent Log in
 * History" tab (the parent's own sessions) is not part of this page.
 */
export function ParentLoginHistory() {
  const { selectedChild } = useSelectedChild();
  return (
    <ParentChildRequired>
      {/* Keyed by child: switching child starts again on page 1 with an empty search. */}
      <SelectedChildLoginHistory key={selectedChild?.userId} />
    </ParentChildRequired>
  );
}

function SelectedChildLoginHistory() {
  const { isLoading, sessionOut, failed, attendance, loginHistories, studentName, retry } = useParentLoginHistory();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Legacy buildPageData: "Oct 30, 2026 10:15 AM" -> date = first 3 words, time = the rest.
  const firstLoginParts = String(attendance.firstLogin || "").split(" ");
  const firstLoginDate = firstLoginParts.slice(0, 3).join(" ");
  const firstLoginTime = firstLoginParts.length > 3 ? firstLoginParts.slice(3).join(" ") : attendance.firstLogin;

  const sessions = useMemo(
    () =>
      loginHistories.map((row) => ({
        login: row?.loginTime || "N/A",
        logout: row?.logOutTime || "N/A",
        location: row?.loginLocation || "N/A",
        duration: row?.totalLoginDuretion || "N/A",
      })),
    [loginHistories],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(term)));
  }, [sessions, search]);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const cells = (row, index) => [
    page * PAGE_SIZE + index + 1,
    <span key="in" className="inline-flex items-center gap-1">
      <LogIn className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
      {row.login}
    </span>,
    <span key="out" className="inline-flex items-center gap-1">
      <LogOut className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
      {row.logout}
    </span>,
    row.location,
    <span key="duration" className={row.duration !== "N/A" ? "text-primary" : ""}>
      {row.duration}
    </span>,
  ];

  const status = isLoading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Please log in again."
      : failed
        ? "Unable to load login history."
        : filtered.length === 0
          ? "No log in history found"
          : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3 flex items-center gap-3 px-1">
        <OptimizedImage src={assetUrl("Icon/sidebar/Login_History.png")} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
        <h1 className="text-lg font-bold text-black sm:text-xl">Log in History - {studentName || "N/A"}</h1>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="First Log in" value={firstLoginDate} sub={firstLoginTime} icon={CalendarCheck} tone="success" />
        <SummaryCard label="Last Log in | Duration" value={attendance.lastLogin} sub={attendance.duration} icon={Clock} tone="warning" />
        <SummaryCard label="Total Log in | Duration" value="Till Now" sub={attendance.totalLoginDuretion} icon={TrendingUp} tone="primary" />
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <div className="mb-3 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-bold text-black sm:text-xl">Log in Sessions</h2>
          <label className="relative w-full sm:w-[260px]">
            <span className="sr-only">Search sessions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search sessions..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-black outline-none focus:border-primary"
            />
          </label>
        </div>

        {/* Phones: one card per session (column title beside each value) instead of a 5-column table. */}
        <div className="md:hidden">
          {status ? (
            <div className="border-t border-slate-200 py-8 text-center text-sm text-black/50">
              <p>{status}</p>
              {failed && !isLoading && (
                <button type="button" onClick={retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Try again
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3 px-4">
              {pageRows.map((row, index) => (
                <li key={`${row.login}-${page}-${index}`}>
                  <ParentMobileTableCard rows={cells(row, index).map((value, column) => ({ label: HEADERS[column], value }))} />
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
                  <td colSpan={HEADERS.length} className="py-8 text-center text-black/50">
                    {status}
                    {failed && !isLoading && (
                      <button type="button" onClick={retry} className="ml-3 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
                        Try again
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={`${row.login}-${page}-${index}`} className="border-b border-slate-200">
                    {cells(row, index).map((value, column) => (
                      <td key={HEADERS[column]} className={`py-3 pr-3 ${column === 0 ? "pl-5" : "pl-3"}`}>
                        {value}
                      </td>
                    ))}
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
            total={filtered.length}
            onPageChange={setPage}
            info={(start, end, total) => `Showing ${start}-${end} of ${total} sessions`}
          />
        )}
      </div>

      <div className="mt-3 rounded-[10px] border border-[#bcd4fb] bg-[#f4f8ff] px-4 py-3">
        <p className="flex items-start gap-2 text-sm text-primary sm:text-base">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Security Notice: </span>
            If you notice any suspicious log in activity or unrecognized locations, please contact your administrator immediately. Your account
            security is important to us.
          </span>
        </p>
      </div>
    </div>
  );
}
