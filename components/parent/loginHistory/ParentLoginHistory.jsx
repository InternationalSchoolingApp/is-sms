"use client";

import { useMemo, useState } from "react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { PdFooter } from "@/components/parent/pageParts/PdFooter";
import { PdHero } from "@/components/parent/pageParts/PdHero";
import { firstName } from "@/components/parent/childLabels";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useParentLoginHistory } from "@/hooks/parent/useParentLoginHistory";

const PAGE_SIZE = 10;
const HEADERS = ["S.No", "Log in Date | Time", "Log out Date | Time", "Location", "Duration"];

const ICONS = {
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v4h1",
};

function Svg({ d, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function SummaryCard({ label, value, sub, icon, iconStyle }) {
  return (
    <div className="pv-st">
      <div>
        <small>{label}</small>
        <b className="sm">{value || "N/A"}</b>
        <span className="d">{sub || "N/A"}</span>
      </div>
      <i style={iconStyle}>
        <Svg d={icon} />
      </i>
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

  const status = isLoading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Please log in again."
      : failed
        ? "Unable to load login history."
        : filtered.length === 0
          ? "No log in history found"
          : null;

  const name = firstName(studentName);

  return (
    <section className="sch on" aria-label="Log in history" aria-busy={isLoading}>
      <PdHero title={name ? `${name}\u2019s Log in History` : "Log in History"} subtitle={name ? `See when and where ${name} logged in.` : ""} />

      <div className="pv-stats">
        <SummaryCard label="First Login" value={firstLoginDate} sub={firstLoginTime} icon={ICONS.flag} />
        <SummaryCard
          label="Last Login | Duration"
          value={attendance.lastLogin}
          sub={attendance.duration}
          icon={ICONS.clock}
          iconStyle={{ background: "#E2F3E6", color: "#13802B" }}
        />
        <SummaryCard
          label="Total Login | Duration"
          value="Till Now"
          sub={attendance.totalLoginDuretion}
          icon={ICONS.trend}
          iconStyle={{ background: "#FFF2CC", color: "#B98200" }}
        />
      </div>

      <div className="fcard">
        <div className="pv-hd" style={{ alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Log in Sessions</h3>
          <div className="dc-tools">
            <label className="dc-srch">
              <Svg d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5" size={18} />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search sessions..."
                aria-label="Search sessions"
              />
            </label>
          </div>
        </div>

        <div className="ftw">
          <table className="ftbl">
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {status ? (
                <tr>
                  <td colSpan={HEADERS.length} className="pv-empty" style={{ display: "block", textAlign: "center" }}>
                    {status}
                    {failed && !isLoading && (
                      <button type="button" onClick={retry} className="fbtn o" style={{ marginLeft: 12, height: 32, cursor: "pointer" }}>
                        Try again
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={`${row.login}-${page}-${index}`}>
                    <td data-l={HEADERS[0]}>{page * PAGE_SIZE + index + 1}</td>
                    <td data-l="Log in">{row.login}</td>
                    <td data-l="Log out">{row.logout}</td>
                    <td data-l={HEADERS[3]}>{row.location}</td>
                    <td data-l={HEADERS[4]}>{row.duration}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!status && (
          <PdFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            info={(start, end, total) => `Showing ${start}-${end} of ${total} sessions`}
          />
        )}

        <div className="pv-note">
          <Svg d={ICONS.info} size={20} />
          <div>
            <b>Security Notice:</b> If you notice any suspicious login activity or a location you don’t recognise{name ? ` on ${name}\u2019s account` : ""}, please
            contact the school immediately.
          </div>
        </div>
      </div>
    </section>
  );
}
