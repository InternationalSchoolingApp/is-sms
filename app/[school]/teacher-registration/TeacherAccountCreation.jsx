"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { TeacherAccountForm } from "@/components/teacher-registration/TeacherAccountForm";
import { SchoolLogo } from "@/components/student-enroll/SchoolLogo";
import { Footer } from "@/components/common/Footer";
import { getPublicSchoolInfo } from "@/services/studentSignupApi";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { loginPageUrl } from "@/utils/backendOrigin";

// Client half of /{school}/teacher-registration (the public landing page, where a teacher creates the account).
// The Server Component page hands over the school slug and the reCAPTCHA settings as plain props; this component runs
// the browser-bound bootstrap: the school's numeric id (public, pre-login) and its policy links.
//
// Login itself is not served by this app: "Log in" goes to the Java app's own login page.
const FALLBACK_LINK = "#";

export function TeacherAccountCreation({ school, recaptchaRequired, recaptchaSiteKey }) {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [links, setLinks] = useState(null);
  const [setupError, setSetupError] = useState("");
  const [setupAttempt, setSetupAttempt] = useState(0);

  // A new teacher signs up in this tab: it no longer works for the tab's earlier user (components/auth/TabAccount.jsx),
  // so the signup is not sent as them.
  useEffect(() => {
    try {
      window.sessionStorage.removeItem("isx-account");
    } catch {
      // storage unavailable: nothing was remembered either
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPublicSchoolInfo(school)
      .then((info) => {
        if (cancelled) return;
        if (!info?.schoolNumericId) {
          setSetupError("We couldn’t load the registration form. Please try again.");
          return;
        }
        setSchoolInfo(info);
        // The policy links are only needed for the terms line: the form works without them.
        return getSchoolSettingsLinks(info.schoolNumericId)
          .then((result) => {
            if (!cancelled) setLinks(result || {});
          })
          .catch((err) => {
            console.error("School links fetch failed:", err);
            if (!cancelled) setLinks({});
          });
      })
      .catch((err) => {
        console.error("Teacher registration setup failed:", err);
        if (!cancelled) setSetupError("We couldn’t load the registration form. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [school, setupAttempt]);

  const schoolName = schoolInfo?.schoolName || "";
  const context = {
    schoolUUID: school,
    schoolNumericId: schoolInfo?.schoolNumericId,
    schoolName,
    loginUrl: loginPageUrl(school),
    termsOfUseUrl: links?.termasOfUserUrl || FALLBACK_LINK,
    privacyPolicyUrl: links?.privacyPolicyUrl || FALLBACK_LINK,
  };

  return (
    <main className="relative flex min-h-dvh flex-col bg-white md:bg-[#F2F5FA]" data-testid="teacher-registration-landing">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Desktop hero column: logo, heading and the illustration pinned to the bottom-left. */}
        <section className="relative hidden flex-col overflow-hidden px-10 pt-8 md:flex md:w-[42%] lg:w-[45%]">
          <SchoolLogo schoolName={schoolName} width={260} />
          <div className="mt-8">
            <h1 className="text-[clamp(1.5rem,2.6vw,2.1rem)] font-extrabold leading-tight text-primary">
              Teacher Registration
            </h1>
            <p className="mt-1.5 max-w-sm text-[clamp(0.85rem,1vw,1rem)] font-medium text-slate-600">
              Create your account to start your teaching journey with us.
            </p>
          </div>
          <div className="pointer-events-none relative -mx-10 mt-6 min-h-0 flex-1">
            <Image src="/images/enrollement_bg.png" alt="" fill className="object-contain object-left-bottom" priority />
          </div>
        </section>

        <section className="relative flex flex-1 items-start justify-center p-4 md:items-center md:overflow-y-auto md:p-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-4 shadow-[0_0_24px_rgba(15,23,42,0.12)] sm:p-8 md:p-10 md:shadow-xl md:shadow-slate-900/5 md:ring-1 ring-slate-900/5">
            {/* Mobile heading (the hero column is desktop only). */}
            <div className="mb-5 flex flex-col items-center gap-3 text-center md:hidden">
              <SchoolLogo schoolName={schoolName} width={200} />
              <h1 className="text-lg font-extrabold text-black">Teacher Registration</h1>
            </div>
            <div className="mb-5 hidden text-center md:block">
              <h2 className="text-lg font-bold leading-tight text-slate-800">Create your account</h2>
            </div>

            {!schoolInfo && setupError && (
              <div className="mb-5 space-y-3 text-center" role="alert">
                <p className="text-sm font-medium text-rose-700">{setupError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSetupError("");
                    setSetupAttempt((attempt) => attempt + 1);
                  }}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Retry setup
                </button>
              </div>
            )}

            <TeacherAccountForm
              context={context}
              canSubmit={Boolean(schoolInfo?.schoolNumericId)}
              recaptchaRequired={recaptchaRequired}
              recaptchaSiteKey={recaptchaSiteKey}
              // A full navigation: the redirect is the SSO link that signs the new teacher in to this app.
              onRedirect={(url) => url && (window.location.href = url)}
            />
          </div>
        </section>
      </div>

      <Footer schoolName={schoolName} />
    </main>
  );
}
