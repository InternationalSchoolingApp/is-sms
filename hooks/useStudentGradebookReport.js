"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentGradebookReport } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

// Report dates travel as the backend's mm-dd-yyyy strings.
function toDate(value) {
  const [mm, dd, yyyy] = String(value || "").split("-").map(Number);
  return yyyy ? new Date(yyyy, mm - 1, dd) : undefined;
}

/**
 * Progress Reports "View" — one gradebook report (legacy get-user-gradebook JSP page,
 * fetched as JSON). params = the row's decoded payload, with dates replaced by the
 * report's own date search. dummyUrl = a dummy-mode row's report link: the same JSON
 * comes from the dummy generator instead (legacy getDummyStudentProgressReportHtml).
 */
export function useStudentGradebookReport({ schoolUUID, uniqueId, params, dummyUrl }) {
  const dummy = useDummyStudent();
  const useDummy = Boolean(dummyUrl && dummy.enabled);
  const query = useQuery({
    queryKey: ["student-gradebook-report", schoolUUID, uniqueId, params, useDummy && dummyUrl, dummy.key],
    queryFn: () => {
      if (!useDummy) return getStudentGradebookReport({ schoolUUID, uniqueId, params });
      const report = dummy.student.progressReport(dummyUrl, { start: toDate(params?.startdate), end: toDate(params?.enddate) });
      return { ...report, subReportType: params?.subReportType ?? report.subReportType };
    },
    enabled: Boolean(schoolUUID && uniqueId && params?.data && dummy.settled),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return { isLoading: query.isLoading, report: query.data };
}
