"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Stage1StudentDetails } from "@/components/student-enroll/Stage1StudentDetails";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { getPublicSchoolInfo } from "@/services/studentSignupApi";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";

// GAP (Step 10 territory, not this step): the real post-login landing URL
// is singleSignOnUtil.getRedirectUrl(user, schoolUuid) server-side, which
// hasn't been confirmed to point here. This route exists so Stage 1 has
// somewhere authenticated to render/be tested — wire the real redirect
// target once background polling & stage resume (Step 10) are built, and
// this will also be where a SignupWizard/useStudentSignupState stage
// switcher (Stage 2, Stage 3, ...) eventually lives, per the plan's
// component structure.
export default function StudentEnrollmentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  const schoolUUID = params.schoolId;

  // Direct-hit this URL with no session (e.g. a bookmark, a page reload, a
  // shared link) → next-auth resolves `status` to "unauthenticated" once it
  // has checked; send them to login instead of leaving them on a dead-end
  // page. "loading" is the initial/in-between state and must NOT redirect —
  // only a confirmed absence of a session should.
  useEffect(() => {
    if (status === "unauthenticated" && schoolUUID) {
      router.replace(`/${schoolUUID}/common/login`);
    }
  }, [status, schoolUUID, router]);

  useEffect(() => {
    if (!schoolUUID) return;
    let cancelled = false;
    getPublicSchoolInfo(schoolUUID)
      .then((info) => {
        if (cancelled || !info) return;
        setSchoolInfo(info);
        return getSchoolSettingsLinks(info.schoolNumericId);
      })
      .then((links) => {
        if (!cancelled && links?.logoUrl) setLogoUrl(links.logoUrl);
      })
      .catch((err) => console.error("School info/links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [schoolUUID]);

  // Covers "loading" (session not resolved yet), the brief window before
  // the redirect effect above actually navigates away once
  // status === "unauthenticated", and the school-info fetch still pending.
  if (status !== "authenticated" || !session?.userId || !schoolInfo) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }

  const context = {
    schoolUUID,
    schoolNumericId: schoolInfo.schoolNumericId,
    schoolName: schoolInfo.schoolName,
    // enrollmentFor/learningProgram aren't carried by the session today —
    // same open item as above; default to the most common path until Step
    // 10 threads the real values through. "enrollment" (not "STUDENT") is
    // confirmed correct here: it's the literal enrollmentFor segment from
    // the real account-creation URL a live signup used
    // (/international-schooling/student/enrollment/O — see
    // app/[schoolId]/student/[enrollmentFor]/[learningProgram]/page.jsx),
    // and "STUDENT" returned zero grades from get-enrollments-grades.
    enrollmentFor: "enrollment",
    learningProgram: "O",
  };

  return (
    <EnrollmentWizardShell
      schoolName={schoolInfo.schoolName}
      logoUrl={logoUrl}
      currentStepKey="student"
      onLogout={() => signOut({ callbackUrl: `/${schoolUUID}/common/login` })}
    >
      <Stage1StudentDetails
        context={context}
        userId={session.userId}
        onNext={(fields) => console.log("Stage 1 complete, TODO Stage 2:", fields)}
      />
    </EnrollmentWizardShell>
  );
}
