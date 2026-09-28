"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Button } from "@/components/ui/button";
import { CaptchaField } from "@/components/student-enroll/CaptchaField";
import { getPublicSchoolInfo } from "@/services/studentSignupApi";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { isValidEmail, isValidCaptcha } from "@/utils/studentSignupValidation";

/**
 * Rebuild of Login.jsp / loginFormContent() (loginContent.js) — same fields
 * (username/email, password, captcha) and the same
 * POST {schoolId}/api/v1/common/login call (via services/authApi.js), but
 * submitted through next-auth's signIn("credentials", ...) instead of a raw
 * fetch, so a real next-auth session (session.userId) gets established —
 * that's the whole reason this page exists: without it there was no way to
 * reach an authenticated route like /[schoolId]/student/enrollment (Stage 1)
 * from the Next.js app at all.
 *
 * KNOWN SIMPLIFICATION vs. the legacy page: login.js branches on specific
 * statusCodes (0043 "email not verified", 02/0042 "account declined") into
 * their own modals (#allReadyEmail). next-auth's authorize() only surfaces
 * a single error message string on failure (see route.js), so those two
 * cases show as a plain inline message here instead of a dedicated modal —
 * acceptable for now, revisit if that distinction turns out to matter.
 */
export default function LoginPage() {
  const params = useParams();
  const schoolUUID = params.schoolId;

  const [schoolInfo, setSchoolInfo] = useState(null);
  const [links, setLinks] = useState(null);
  const [fields, setFields] = useState({ email: "", password: "", captcha: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [captchaCacheBust, setCaptchaCacheBust] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!schoolUUID) return;
    let cancelled = false;
    getPublicSchoolInfo(schoolUUID)
      .then((info) => {
        if (cancelled || !info) return;
        setSchoolInfo(info);
        return getSchoolSettingsLinks(info.schoolNumericId);
      })
      .then((linksData) => {
        if (!cancelled && linksData) setLinks(linksData);
      })
      .catch((err) => console.error("School info/links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [schoolUUID]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function refreshCaptcha() {
    setCaptchaCacheBust(Date.now());
    setField("captcha", "");
  }

  function validate() {
    const nextErrors = {};
    if (!isValidEmail(fields.email)) nextErrors.email = "Username is either empty or invalid";
    if (!fields.password.trim()) nextErrors.password = "Either password is empty or invalid";
    if (!isValidCaptcha(fields.captcha)) nextErrors.captcha = "Either captcha is empty or invalid";
    return nextErrors;
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    if (!schoolInfo?.schoolNumericId) return;

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: fields.email,
        password: fields.password,
        captcha: fields.captcha,
        schoolUUID,
        schoolNumericId: schoolInfo.schoolNumericId,
        redirect: false,
      });

      if (!result || result.error) {
        setErrors((prev) => ({ ...prev, form: result?.error || "Login failed. Please try again." }));
        refreshCaptcha();
        return;
      }

      // Intentionally NOT following the backend's own redirectUrl here — it
      // always points at the legacy JSP app's own continuation URL (the
      // backend has no concept of this Next.js app), which is exactly the
      // gap this login page exists to work around. Send the user to our own
      // enrollment route instead; swap this once a real stage-resume
      // destination is confirmed (Step 10).
      const session = await getSession();
      debugger
      console.log("Login succeeded, backend redirectUrl (unused) was:", session?.redirectUrl);
      window.location.href = `/${schoolUUID}/student/enrollment`;
    } catch (err) {
      console.error("Login submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-6">
      <div className="pointer-events-none absolute -left-16 top-24 h-40 w-40 rounded-full bg-white/15 blur-sm" />
      <div className="pointer-events-none absolute right-24 top-10 h-28 w-28 rounded-full border-2 border-white/30" />
      <div className="pointer-events-none absolute right-10 top-36 h-16 w-16 rounded-full bg-amber-300/70" />
      <div className="pointer-events-none absolute bottom-16 left-24 h-24 w-24 rounded-full bg-pink-300/50" />
      <div className="pointer-events-none absolute bottom-10 right-16 h-36 w-36 rounded-full bg-white/10" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white py-4 px-6 shadow-xl">
        {links?.logoUrl && (
          <div className="mb-4 flex justify-center border-b pb-4">
            <Image src={links.logoUrl} alt={schoolInfo?.schoolName || ""} width={180} height={38} className="h-auto w-full max-w-[300px]" unoptimized />
          </div>
        )}

        <h4 className="text-center text-lg font-semibold text-primary">School Management System</h4>

        <div className="my-5 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-blue-50">
            <User className="h-9 w-9 text-primary" />
          </div>
        </div>

        <h1 className="mb-5 text-center text-2xl font-bold">
          <span className="text-primary">Welcome</span> <span className="text-green-600">back!</span>
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FloatingLabelInput
            icon={User}
            label="Username"
            name="email"
            type="email"
            autoComplete="username"
            value={fields.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
          />
          <FloatingLabelInput
            icon={Lock}
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={fields.password}
            onChange={(e) => setField("password", e.target.value)}
            error={errors.password}
            trailing={
              <button
                type="button"
                // Prevent the password input from blurring on tap — on
                // mobile, blurring closes the keyboard and resizes the
                // viewport under the finger between touchstart/touchend,
                // which cancels the click. Same fix already used in
                // AccountForm.jsx's password toggle.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            }
          />

          <p className="text-right text-sm">
            <a href={`/${schoolUUID}/common/forgot-password`} className="text-primary">
              Forgot Password?
            </a>
          </p>

          <CaptchaField
            schoolUUID={schoolUUID}
            value={fields.captcha}
            onChange={(v) => setField("captcha", v)}
            error={errors.captcha}
            cacheBust={captchaCacheBust}
            onRefresh={refreshCaptcha}
          />

          {errors.form && <p className="text-center text-sm font-semibold text-red-600">{errors.form}</p>}

          <div className="pt-2 text-center">
            <Button type="submit" disabled={submitting} className="w-40 rounded-full bg-primary hover:bg-primary/90">
              {submitting ? "Please wait…" : "Log in"}
            </Button>
          </div>

          <div className="space-y-1 pt-3 text-center text-xs text-slate-500">
            <p>
              {links?.termasOfUserUrl && (
                <a href={links.termasOfUserUrl} target="_blank" rel="noreferrer" className="text-primary">
                  Terms of use
                </a>
              )}
              {links?.termasOfUserUrl && links?.privacyPolicyUrl && <span className="mx-1">•</span>}
              {links?.privacyPolicyUrl && (
                <a href={links.privacyPolicyUrl} target="_blank" rel="noreferrer" className="text-primary">
                  Privacy Policy
                </a>
              )}
            </p>
            <p>Copyright © {new Date().getFullYear()} - {schoolInfo?.schoolName || ""} - All Rights Reserved.</p>
          </div>
        </form>
      </div>
    </main>
  );
}
