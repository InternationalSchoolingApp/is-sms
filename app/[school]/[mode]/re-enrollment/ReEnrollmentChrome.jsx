"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { ReEnrollmentShell } from "@/components/re-enrollment/ReEnrollmentShell";
import { ReEnrollmentProvider, useReEnrollmentContext } from "@/hooks/useReEnrollment";
import { MODE_EMBED } from "@/utils/reEnrollmentSteps";
import { expireSession, logoutEverywhere } from "@/utils/logout";

/**
 * Chrome of the re-enrollment pages, mounted once by the route layout: resolves the re-enrollment context
 * (session, ENROLLMENT_VIA_NEXTJS, eligibility) and wraps every screen in the dashboard-style shell.
 */
function Frame({ children }) {
  const { school, mode } = useParams();
  const { status, session, context, logoUrl, rootcss, ready, eligibility, leavingForDashboard, loadFailed, retryLoading } = useReEnrollmentContext();

  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  // Back/forward can restore this page from the bfcache with its old session (e.g. after logout).
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (loadFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f1f4f6] px-4 text-center">
        <p className="text-sm font-semibold text-red-600">Could not load your re-enrollment details.</p>
        <button type="button" onClick={() => retryLoading()} className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          Try again
        </button>
      </div>
    );
  }
  // Nothing of the pages shows until the context is ready, and not at all while leaving for the dashboard.
  if (!ready || leavingForDashboard) return <FullScreenLoader />;

  return (
    <ReEnrollmentShell
      embed={mode === MODE_EMBED}
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      rootcss={rootcss}
      studentName={eligibility?.studentName}
      onLogout={() => logoutEverywhere(session)}
    >
      {children}
    </ReEnrollmentShell>
  );
}

export function ReEnrollmentChrome({ children }) {
  return (
    <ReEnrollmentProvider>
      <Frame>{children}</Frame>
    </ReEnrollmentProvider>
  );
}
