"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AccountForm } from "@/components/student-enroll/AccountForm";
import { AccountFormOfflineB2B } from "@/components/student-enroll/AccountFormOfflineB2B";
import { EmailVerificationPanel } from "@/components/student-enroll/EmailVerificationPanel";
import { SchoolLogo } from "@/components/student-enroll/SchoolLogo";
import { Footer } from "@/components/common/Footer";
import { SignupFooter } from "@/components/student-enroll/SignupFooter";
import { getEnrollmentSignupInfo, getPublicSchoolInfo } from "@/services/studentSignupApi";
import { getLearningProgramTheme } from "@/utils/learningProgramTheme";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

// Client half of the /{school}/enrollment/{program} route. The route params
// (`school`, `program`) and the raw query string come from the Server
// Component page (page.jsx) as plain props — this component then runs the
// browser-bound enrollment bootstrap: a public, pre-login fetch whose result
// supplies the form defaults and school policy links, plus gateway/redirect
// handling and the mobile header/footer padding sync. All of that is
// genuinely client-only (window redirects, retry, ResizeObserver), so it
// stays here while the page itself remains a Server Component.
//
// Login itself is NOT served by this Next.js app — it stays on the legacy
// Java/Spring Boot app (Login.jsp), reached via loginUrl below.
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

// Matches the enum values ClientSignupStudentController resolves
// learningProgramNew/learningProgram into — see utils/learningProgramTheme.js.
const VALID_LEARNING_PROGRAMS = ["O", "DD", "ONE_TO_ONE_FLEX", "G", "SCHOLARSHIP", "SSP"];

export function AccountCreationForm({ school, program, query }) {
  const searchParams = useMemo(() => new URLSearchParams(query || ""), [query]);
  const search = searchParams.toString();

  const isOffline = searchParams.get("mode") === "offline";
  const [verificationEmail, setVerificationEmail] = useState(null);
  const [signupInfo, setSignupInfo] = useState(null);
  const [signupInfoError, setSignupInfoError] = useState("");
  const [signupInfoAttempt, setSignupInfoAttempt] = useState(0);

  const schoolUUID = school;
  const enrollmentFor = program;
  const learningProgram = VALID_LEARNING_PROGRAMS.includes(program) ? program : "O";
  const theme = getLearningProgramTheme(learningProgram);

  const [schoolInfo, setSchoolInfo] = useState(FALLBACK_SCHOOL_INFO);

  const schoolSettingsLinks = signupInfo?.schoolSettingsLinks || {};
  const displayedSchoolName = signupInfo?.schoolName || schoolInfo.schoolName || "";
  const displayedProgramLabel = signupInfo?.programLabel || signupInfo?.learningProgramLabel || theme.label;
  const context = signupInfo
    ? {
        schoolUUID: signupInfo.schoolUuid || schoolUUID,
        schoolNumericId: schoolSettingsLinks.schoolId ?? schoolInfo.schoolNumericId,
        schoolName: signupInfo.schoolName || schoolInfo.schoolName,
        whatsAppNumber: schoolInfo.whatsAppNumber,
        enrollmentStatus: signupInfo.status,
        enrollmentFor: signupInfo.enrollmentFor || enrollmentFor,
        learningProgram,
        backendLearningProgram: signupInfo.learningProgram,
        courseProviderId: signupInfo.courseProviderId,
        programLabel: signupInfo.programLabel,
        moduleNameToDisplay: signupInfo.moduleNameToDisplay,
        moduleId: signupInfo.moduleId,
        captchaRandomNumber: signupInfo.captchaRandomNumber,
        uniqueId: signupInfo.UNIQUEUUID,
        ras: signupInfo.ras,
        referralCode: signupInfo.referralCode || new URLSearchParams(search).get("referralCode") || "",
        signupType: signupInfo.signupType,
        learningProgramLabel: signupInfo.learningProgramLabel,
        unregisteredId: signupInfo.unregisteredId,
        schoolSettingsLinks,
        loginUrl: `${resolveBackendOrigin()}/${signupInfo.schoolUuid || schoolUUID}/common/login`,
        termsOfUseUrl: schoolSettingsLinks.termasOfUserUrl || FALLBACK_POLICY_LINKS.termsOfUseUrl,
        privacyPolicyUrl: schoolSettingsLinks.privacyPolicyUrl || FALLBACK_POLICY_LINKS.privacyPolicyUrl,
        enrollmentPolicyUrl: schoolSettingsLinks.enrollmentPolicyUrl || FALLBACK_POLICY_LINKS.enrollmentPolicyUrl,
        schoolPolicyUrl: schoolSettingsLinks.schoolPolicyUrl || FALLBACK_POLICY_LINKS.schoolPolicyUrl,
        studentPolicyUrl: schoolSettingsLinks.studentPolicytUrl || FALLBACK_POLICY_LINKS.studentPolicyUrl,
      }
    : null;

  // Public enrollment bootstrap. The exact URL query (including referralCode,
  // ras, payload, and v when present) is sent to the backend; its response
  // supplies the form defaults and school policy links.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!schoolUUID) {
        setSignupInfoError("We couldn’t identify your school. Please open the enrollment link again.");
        return;
      }

      setSignupInfoError("");
      setSignupInfo(null);
      getEnrollmentSignupInfo(schoolUUID, learningProgram, new URLSearchParams(search))
        .then((response) => {
          if (cancelled) return;
          if (response?.status === "SUCCESS") {
            setSignupInfo(response);
            return;
          }
          if (response?.status === "REDIRECT" && response.redirectTo) {
            window.location.assign(response.redirectTo);
            return;
          }
          const message = response?.message?.replace(/^FAILED\|/, "").trim();
          setSignupInfoError(message || "We couldn’t load the enrollment form. Please try again.");
        })
        .catch((error) => {
          console.error("Enrollment setup failed:", error);
          if (!cancelled) setSignupInfoError("We couldn’t load the enrollment form. Please try again.");
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [schoolUUID, learningProgram, search, signupInfoAttempt]);

  // The enrollment initialization response includes school settings links;
  // keep the existing public-info lookup only for the WhatsApp support number.
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
      })
      .catch((error) => console.error("School support info fetch failed:", error));
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
    <main className="relative flex min-h-screen flex-col bg-[#eef4fb] bg-gradient-to-b from-[#eaf2fc] via-[#eef5fc] to-[#e7f0fb] md:h-screen md:min-h-0 md:overflow-hidden">
      {/* Soft decorative blobs — the light-blue organic wave shapes behind
          everything on desktop. Purely decorative, so hidden from a11y and
          from pointer events; below md the layout is compact so they're
          hidden there. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#d7e6fb] opacity-60 blur-3xl" />
        <div className="absolute left-1/3 top-10 h-72 w-72 rounded-full bg-[#dcebfd] opacity-50 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-96 w-96 rounded-full bg-[#d9e8fc] opacity-50 blur-3xl" />
      </div>

      {/* Compact mobile-only header — small icon logo + badge + heading +
          divider, no photo hero. Hidden from md up, where the hero column
          below takes over instead. Keeps id="signupMobileHeader" so the
          padding-sync effect can still measure it. */}
      <div
        id="signupMobileHeader"
        className="fixed left-0 top-0 z-20 flex w-full flex-col items-center gap-2 border-b border-slate-200 bg-[#F0F9FD] px-4 py-3 backdrop-blur md:hidden"
      >
        <SchoolLogo schoolName={displayedSchoolName} width={180} />
        <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold text-white">
          {displayedProgramLabel}
        </span>
      </div>

      {/* Content row: hero (left, fixed) + form (right, scrollable). On
          desktop this row is a fixed-height flex box (min-h-0 so children
          can scroll independently); the footer sits below it, pinned to the
          viewport bottom. */}
      <div className="relative z-10 flex flex-1 flex-col md:min-h-0 md:flex-row">
        {/* Desktop hero column — FIXED (does not scroll). Full column height,
            logo + heading at top, hero image filling the lower portion and
            pinned to the bottom-left. */}
        <section className="relative hidden h-full flex-col overflow-hidden px-10 pt-8 md:flex md:w-[42%] lg:w-[45%]">
          <div className="flex items-center gap-2">
            <SchoolLogo schoolName={displayedSchoolName} width={260} />
          </div>

          <div className="mt-8">
            <h1 className="text-[clamp(1.5rem,2.6vw,2.1rem)] font-extrabold leading-tight text-primary">
              {displayedProgramLabel}
            </h1>
            {theme.subtitle && (
              <p className="mt-1.5 max-w-sm text-[clamp(0.85rem,1vw,1rem)] font-medium text-slate-600">
                {theme.subtitle}
              </p>
            )}
          </div>

          {/* Image takes all remaining column height (flex-1) and is pinned
              bottom-left, so on desktop the whole illustration stays inside
              the viewport instead of scrolling away. */}
          <div className="pointer-events-none relative mt-6 -ml-10 min-h-0 flex-1 w-[calc(100%+2.5rem)]">
            <Image
              src="/images/signup-new.png"
              alt=""
              fill
              className="object-contain object-left-bottom"
              priority
            />
          </div>
        </section>

        {/* Form column — the ONLY scrollable region on desktop. If the card
            is taller than the viewport, this column scrolls; the hero stays
            put. */}
        <section
          id="enrollmentFormWrapper"
          className="relative flex flex-1 items-start justify-center p-4 md:overflow-y-auto md:p-8"
        >
          {/* my-auto centers the card when it fits, but still lets the top
              scroll into view (no clipping) when it's taller than the
              column — unlike items-center, which would clip the top. */}
          <div className="my-4 w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-8 md:my-auto md:p-10">
            {!signupInfo ? (
              signupInfoError ? (
                <div className="space-y-4 py-6 text-center" role="alert">
                  <p className="text-sm font-medium text-rose-700">{signupInfoError}</p>
                  <button
                    type="button"
                    onClick={() => setSignupInfoAttempt((attempt) => attempt + 1)}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite">
                  <span className="size-9 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
                  <p className="text-sm font-medium text-slate-600">Preparing your enrollment form...</p>
                </div>
              )
            ) : verificationEmail ? (
              <EmailVerificationPanel
                email={verificationEmail}
                context={context}
                onClose={() => setVerificationEmail(null)}
              />
            ) : isOffline ? (
              <AccountFormOfflineB2B context={context} onRedirect={(url) => url && (window.location.href = url)} />
            ) : (
              <AccountForm
                context={context}
                onVerificationEmailSent={setVerificationEmail}
                onRedirect={(url) => url && (window.location.href = url)}
              />
            )}
          </div>
        </section>
      </div>

      {/* Full-width desktop footer — spans the WHOLE page bottom (under both
          columns), not just the hero. Year + school name are dynamic (year
          from the client clock; school name from the per-school context
          resolved from ?school=). Mobile keeps its own copyright line inside
          SignupFooter. */}
      <Footer schoolName={displayedSchoolName} />

      {/* Desktop-only floating WhatsApp support button (bottom-right).
          Mobile keeps the fixed WhatsApp footer bar via SignupFooter. */}
      {context?.whatsAppNumber && (
        <a
          href={`https://api.whatsapp.com/send?phone=${context.whatsAppNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Enrollment support on WhatsApp"
          className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform hover:scale-105 md:flex"
          style={{ background: "#25D366" }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="#fff">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zm4.7 10.3c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1 2.1-.4 3.4a11 11 0 0 0 4.5 4.5c1.9.9 2.7.8 3.4.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3z" />
          </svg>
        </a>
      )}

      <SignupFooter whatsAppNumber={context?.whatsAppNumber} schoolName={displayedSchoolName} />
    </main>
  );
}
