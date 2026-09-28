"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { AccountForm } from "@/components/student-enroll/AccountForm";
import { AccountFormOfflineB2B } from "@/components/student-enroll/AccountFormOfflineB2B";
import { EmailVerificationPanel } from "@/components/student-enroll/EmailVerificationPanel";
import { SignupFooter } from "@/components/student-enroll/SignupFooter";
import { getPublicSchoolInfo } from "@/services/studentSignupApi";
import { getLearningProgramTheme } from "@/utils/learningProgramTheme";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

// This route (/{enrollmentFor}/{learningProgram}) is flat — no {schoolId}
// path segment. Unlike /step/1,2,3 (which get schoolUUID from the Auth.js
// session post-login), this page runs BEFORE any login, so there's no
// session yet — schoolUUID comes from a `?school=` query param instead
// (e.g. /enrollment/O?school=international-schooling). Everything else
// school-specific (numeric id, name, WhatsApp number, policy links) is still
// resolved per-request from that slug via the backend, NOT from env vars —
// one Next.js deployment still serves every school, same as the JSP app.
//
// Login itself is NOT served by this Next.js app — it stays on the legacy
// Java/Spring Boot app (Login.jsp), reached via loginUrl below. There is no
// Next.js-hosted login page/route anymore.
const FALLBACK_SCHOOL_INFO = {
  schoolNumericId: undefined,
  schoolName: "",
  whatsAppNumber: undefined,
};
const FALLBACK_POLICY_LINKS = {
  termsOfUseUrl: "#",
  privacyPolicyUrl: "#",
  enrollmentPolicyUrl: "#",
  schoolPolicyUrl: "#",
  studentPolicyUrl: "#",
};

export default function AccountCreationPage() {
  return (
    <Suspense fallback={null}>
      <AccountCreationPageContent />
    </Suspense>
  );
}

// Matches the enum values ClientSignupStudentController resolves
// learningProgramNew/learningProgram into — see utils/learningProgramTheme.js.
const VALID_LEARNING_PROGRAMS = ["O", "DD", "ONE_TO_ONE_FLEX", "G", "SCHOLARSHIP", "SSP"];

function AccountCreationPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const isOffline = searchParams.get("mode") === "offline";
  const [verificationEmail, setVerificationEmail] = useState(null);

  const schoolUUID = searchParams.get("school");
  const enrollmentFor = params.enrollmentFor;
  // Matched case-insensitively (the confirmed live URLs used lowercase
  // codes) and falls back to "O", the same default
  // ClientSignupStudentController#commonSignupContent applies server-side
  // when the segment doesn't resolve to a real LearningProgram.
  const requestedProgram = (params.learningProgram || "").toUpperCase();
  const learningProgram = VALID_LEARNING_PROGRAMS.includes(requestedProgram) ? requestedProgram : "O";
  const theme = getLearningProgramTheme(learningProgram);

  const [schoolInfo, setSchoolInfo] = useState(FALLBACK_SCHOOL_INFO);
  const [policyLinks, setPolicyLinks] = useState(FALLBACK_POLICY_LINKS);

  const context = {
    schoolUUID,
    enrollmentFor,
    learningProgram,
    // Login is served by the legacy Java app, not this Next.js app — see
    // the file-header comment above.
    loginUrl: `${resolveBackendOrigin()}/${schoolUUID}/common/login`,
    ...schoolInfo,
    ...policyLinks,
  };

  // Resolves {schoolId} into numeric id/name/WhatsApp number, then — once
  // the numeric id is known — the policy/legal links, which need it in
  // their request body. See services/studentSignupApi.js
  // (getPublicSchoolInfo) and utils/schoolSettings.js
  // (getSchoolSettingsLinks).
  useEffect(() => {
    if (!schoolUUID) return;
    let cancelled = false;

    getPublicSchoolInfo(schoolUUID)
      .then((info) => {
        if (cancelled || !info) return;
        setSchoolInfo({
          schoolNumericId: info.schoolNumericId,
          schoolName: info.schoolName || FALLBACK_SCHOOL_INFO.schoolName,
          whatsAppNumber: info.whatsAppNumber,
        });
        return getSchoolSettingsLinks(info.schoolNumericId);
      })
      .then((links) => {
        if (cancelled || !links) return;
        setPolicyLinks({
          termsOfUseUrl: links.termasOfUserUrl || FALLBACK_POLICY_LINKS.termsOfUseUrl,
          privacyPolicyUrl: links.privacyPolicyUrl || FALLBACK_POLICY_LINKS.privacyPolicyUrl,
          enrollmentPolicyUrl: links.enrollmentPolicyUrl || FALLBACK_POLICY_LINKS.enrollmentPolicyUrl,
          schoolPolicyUrl: links.schoolPolicyUrl || FALLBACK_POLICY_LINKS.schoolPolicyUrl,
          studentPolicyUrl: links.studentPolicytUrl || FALLBACK_POLICY_LINKS.studentPolicyUrl,
        });
      })
      .catch((err) => console.error("School info/links fetch failed:", err));

    return () => {
      cancelled = true;
    };
  }, [schoolUUID]);

  // Below md (768px) the header/footer are `fixed`, so #enrollmentFormWrapper
  // needs real padding to avoid content sliding underneath them. Measuring
  // their actual rendered height (rather than a hardcoded px value) keeps
  // this correct if their content — badge text, WhatsApp bar presence —
  // ever changes their height. A ResizeObserver (not a "resize" listener)
  // is used deliberately: it fires with the correct size the instant
  // observation starts, so there's no race against layout/webfonts not
  // being ready yet on first render, and it re-fires on any later size
  // change even without a window resize (e.g. the WhatsApp bar appearing).
  useEffect(() => {
    const wrapper = document.getElementById("enrollmentFormWrapper");
    const header = document.getElementById("signupMobileHeader");
    const footer = document.getElementById("signupMobileFooter");
    if (!wrapper || !header || !footer) return;

    // Deliberately "(min-width: 768px)", NOT a separately-constructed
    // "(max-width: 767px)" — the two aren't reliable opposites at
    // fractional/scaled viewport widths (confirmed: at devicePixelRatio 2,
    // a 767px-wide viewport failed "max-width: 767px" but passed
    // "max-width: 768px"). Mirroring Tailwind's own md: breakpoint exactly
    // (min-width: 768px, inverted) keeps this in sync with the
    // md:hidden/md:flex classes on the header/footer/hero elements below.
    const desktopQuery = window.matchMedia("(min-width: 768px)");

    function syncPadding() {
      if (desktopQuery.matches) {
        wrapper.style.paddingTop = "";
        wrapper.style.paddingBottom = "";
      } else {
        wrapper.style.paddingTop = `${header.offsetHeight}px`;
        wrapper.style.paddingBottom = `${footer.offsetHeight}px`;
      }
    }

    syncPadding();
    const resizeObserver = new ResizeObserver(syncPadding);
    resizeObserver.observe(header);
    resizeObserver.observe(footer);
    desktopQuery.addEventListener("change", syncPadding);

    return () => {
      resizeObserver.disconnect();
      desktopQuery.removeEventListener("change", syncPadding);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Compact mobile-only header — matches SignupCommon.jsp's mobile
          layout: small icon logo + badge + heading + divider, no photo
          hero. Hidden from md up, where the blue hero section below takes
          over instead. */}
      <div
        id="signupMobileHeader"
        className="flex fixed z-1 w-full top-0 left-0 items-center gap-3 border-b border-slate-200 bg-white px-4 pb-4 pt-4 md:hidden"
      >
        <Image src="/images/is_fav_logo_200.png" alt={context.schoolName} width={38} height={38} priority />
        <div className="text-center flex-1 right-4 relative">
          <span className="w-fit rounded-full border-2 border-primary bg-primary px-5 py-1.5 text-sm font-bold text-white">
            {theme.label}
          </span>
          <h2 className="text-center text-lg font-bold text-primary max-[767px]:text-[14px] mt-3">
            {isOffline ? "Complete the enrollment" : "Complete the enrollment in under 5 minutes"}
          </h2>
        </div>
      </div>

      <section className="relative hidden flex-col gap-8 overflow-hidden bg-primary p-8 text-white md:flex md:w-2.2/5 lg:w-3/5">
        <div className="relative z-10 mx-auto w-fit rounded-xl bg-white px-4 py-3">
          <Image
            src="/images/IS_Final_Logo.webp"
            alt={context.schoolName}
            width={200}
            height={40}
            className="w-auto"
            priority
          />
        </div>
        <span className="z-10 mx-auto mt-[10%] w-fit rounded-full bg-slate-900 px-5 py-2 text-[clamp(1rem,3vw,1.5rem)] font-bold">
          {theme.label}
        </span>
        <div className="pointer-events-none absolute bottom-0 left-0 h-[45%] w-full">
          <Image src={theme.image} alt="" fill className="object-contain object-bottom" priority />
        </div>
      </section>

      <section id="enrollmentFormWrapper" className="flex flex-1 items-center justify-center bg-white p-8">
        {verificationEmail ? (
          <EmailVerificationPanel
            email={verificationEmail}
            context={context}
            onClose={() => setVerificationEmail(null)}
          />
        ) : isOffline ? (
          <AccountFormOfflineB2B context={context} onRedirect={(url) => url && (window.location.href = url)} />
        ) : (
          <AccountForm
            className="z-[-1]"
            context={context}
            onVerificationEmailSent={setVerificationEmail}
            onRedirect={(url) => url && (window.location.href = url)}
          />
        )}
      </section>

      <SignupFooter whatsAppNumber={context.whatsAppNumber} schoolName={context.schoolName} />
    </main>
  );
}
