"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AccountInput } from "@/components/student-enroll/AccountInput";
import { MailSolidIcon, LockSolidIcon } from "@/components/student-enroll/FieldIcons";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PasswordStrengthChecklist } from "@/components/student-enroll/PasswordStrengthChecklist";
import { CaptchaField } from "@/components/student-enroll/CaptchaField";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { InfoModal, getWelcomeBackMessage } from "@/components/student-enroll/InfoModal";
import { useAccountSignup } from "@/hooks/useAccountSignup";
import { checkEmailAvailability } from "@/services/studentSignupApi";
import { validateAccountFormOnline, isValidEmail } from "@/utils/studentSignupValidation";
import { captureUtmParamsFromUrl } from "@/utils/utmCookies";
import { getHash } from "@/utils/common";

const INITIAL_FIELDS = {
  email: "",
  confirmEmail: "",
  password: "",
  confirmPassword: "",
  captcha: "",
  referralCode: "",
  checkTerms: false,
};

/**
 * Online-mode Account Creation form — the "stage-0" screen (SignupCommon.jsp
 * / signupCommon.js's #userSignupForm), rebuilt with shadcn/ui + Tailwind,
 * wired to the confirmed POST enrollment/stage-1 endpoint.
 */
export function AccountForm({ context, onVerificationEmailSent, onRedirect }) {
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // Stays 0 (stable for SSR) until the user explicitly clicks "refresh" —
  // no cache-busting is needed for the very first image load. Setting this
  // from Date.now() inside a mount effect caused both a hydration mismatch
  // (server/client render at different instants) AND an eslint
  // react-hooks/set-state-in-effect error — a real user-event-driven
  // refresh avoids both problems entirely.
  const [captchaCacheBust, setCaptchaCacheBust] = useState(0);
  const [flaggedModal, setFlaggedModal] = useState(null);
  const [welcomeBackModal, setWelcomeBackModal] = useState(null);
  const formRef = useRef(null);
  // Mirrors signupCommon.js's `prevValue` closure var — avoids re-firing
  // the availability check when the email field blurs without its value
  // actually changing (e.g. tabbing through without editing).
  const lastCheckedEmailRef = useRef("");

  const signup = useAccountSignup({ mode: "online", context });

  useEffect(() => {
    captureUtmParamsFromUrl();
  }, []);

  const emailsMatch = useMemo(
    () => !fields.confirmEmail || fields.email.trim() === fields.confirmEmail.trim(),
    [fields.email, fields.confirmEmail]
  );

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function refreshCaptcha() {
    setCaptchaCacheBust(Date.now());
    setField("captcha", "");
  }

  // Mirrors callEmailCheck() in jquery.commonFunction.js, fired on the
  // email field's blur (not on submit) — this is what shows the "Welcome
  // back" modal as soon as an already-registered email is entered, before
  // the user ever clicks Next. Confirmed at source: statusCode 0044/0043
  // ("email already verified/registered") and 02 ("user declined") both
  // call showWrapper(true, fr, extra1) exactly like the stage-1 submit
  // path already handled in handleSubmit below.
  async function handleEmailBlur(email) {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed) || trimmed === lastCheckedEmailRef.current) return;
    lastCheckedEmailRef.current = trimmed;

    try {
      const response = await checkEmailAvailability(context.schoolUUID, {
        authentication: {
          hash: getHash(),
          schoolId: context.schoolNumericId,
          schoolUUID: context.schoolUUID,
          userType: "STUDENT",
        },
        data: { requestKey: "EMAIL-AVAILABLE", email: trimmed },
      });
      if (!response) return;

      if (response.status === "0" || response.status === "2") {
        if (response.statusCode === "0044" || response.statusCode === "0043" || response.statusCode === "02") {
          setWelcomeBackModal({ msgFlag: response.fr, extra1: response.extra1 });
        }
      }
    } catch (err) {
      console.error("checkEmailAvailability failed:", err);
    }
  }

  async function handleSubmit(e) {
    // Confirmed on real devices: even with autoComplete fixed and
    // preventDefault() called first, iOS Safari still fully reloaded the
    // page and Android Chrome still scroll-jumped with no validation shown
    // on tapping Next. Both point to the SAME underlying cause: the "Next"
    // button was `type="submit"` inside a `<form>`, so ANY tap that lands
    // before React has finished hydrating (a real risk on a real phone's
    // network/CPU, never reproducible in fast local testing) falls through
    // to the browser's NATIVE form submission — which no amount of
    // preventDefault() inside our handler can stop, because our handler
    // was never attached yet. The only reliable fix is to remove the
    // native-submit code path entirely: the button below is now
    // `type="button"` with a plain onClick, so there is nothing for the
    // browser to submit natively even pre-hydration — a stray tap before
    // hydration just does nothing, instead of reloading. See the onClick
    // wiring and the form's onKeyDown (Enter-to-submit) below.
    e?.preventDefault?.();
    e?.stopPropagation?.();

    try {
      // Read the REAL submitted values straight from the DOM via FormData,
      // rather than trusting React state alone. Confirmed on a real mobile
      // device: browser/WebView autofill can set an input's native value
      // without ever firing the input/onChange event React listens for, so
      // `fields.email` etc. can silently stay "" while the field visibly
      // has text. FormData reads what the browser actually has, autofilled
      // or not, so validation and the submit payload are always correct
      // even when React's state missed the update.
      const formData = new FormData(formRef.current);
      const domFields = {
        ...fields,
        email: formData.get("email") || fields.email,
        confirmEmail: formData.get("confirmEmail") || fields.confirmEmail,
        password: formData.get("password") || fields.password,
        confirmPassword: formData.get("confirmPassword") || fields.confirmPassword,
      };
      if (
        domFields.email !== fields.email ||
        domFields.confirmEmail !== fields.confirmEmail ||
        domFields.password !== fields.password ||
        domFields.confirmPassword !== fields.confirmPassword
      ) {
        setFields(domFields);
      }

      const { valid, errors: validationErrors } = validateAccountFormOnline(domFields);
      setErrors(validationErrors);
      if (!valid) return;

      const response = await signup.mutateAsync(domFields);

      if (response.status === "0" || response.status === "2") {
        if (response.statusCode === "FLAGGED") {
          setFlaggedModal({
            schoolName: context.schoolName,
            sessionName: response.message,
          });
          return;
        }
        if (response.statusCode === "0001") {
          // Email already registered — mirrors showWrapper(true, fr, extra1)
          // in signupCommon.js (welcome-back / deactivated / in-progress copy).
          setWelcomeBackModal({ msgFlag: response.fr, extra1: response.extra1 });
          return;
        }
        if (response.statusCode === "0041" || response.statusCode === "0038") {
          refreshCaptcha();
        }
        setErrors((prev) => ({ ...prev, form: response.message }));
        return;
      }

      if (response.emailVerified) {
        onRedirect?.(response.redirectUrl);
      } else {
        onVerificationEmailSent?.(domFields.email);
      }
    } catch (err) {
      // Any thrown/rejected step (network error, unreachable backend, a
      // bug in the code above, etc.) was previously silent — the user just
      // saw nothing happen on "Next" with no error shown at all. Always
      // surface something instead of failing invisibly.
      console.error("AccountForm submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  return (
    <>
      <form
        ref={formRef}
        noValidate
        onKeyDown={(e) => {
          // Preserve "press Enter to submit" now that there's no
          // type="submit" button — but only from a plain text field, never
          // from the terms checkbox/links, and never let the browser treat
          // Enter as a native submit trigger.
          if (e.key === "Enter" && e.target.tagName === "INPUT") {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        className="mx-auto w-full  space-y-5"
      >
        <div className="text-center">
          <h2 className="text-[22px] font-bold leading-tight text-slate-800">
            Complete your enrollment in just 5 minutes.
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Create your account to start your learning journey
          </p>
        </div>

        <AccountInput
          icon={MailSolidIcon}
          label="Enter your email"
          name="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={(e) => handleEmailBlur(e.target.value)}
          error={errors.email}
        />

        <AccountInput
          icon={MailSolidIcon}
          label="Confirm your email"
          name="confirmEmail"
          type="email"
          autoComplete="off"
          value={fields.confirmEmail}
          onChange={(e) => setField("confirmEmail", e.target.value)}
          error={!emailsMatch ? "Email and confirm email are not same" : errors.confirmEmail}
        />

        <div className="relative">
          <AccountInput
            icon={LockSolidIcon}
            label="Enter your password"
            name="password"
            type={showPassword ? "text" : "password"}
            // "new-password" (not "off") is the standards-correct way to
            // tell the browser this is a SIGNUP form, not a login — some
            // mobile browsers otherwise misidentify email+password fields
            // as a saved login and auto-submit the form once autofill
            // fills both, which is very likely the real cause of the
            // "tapping Next reloads the page" bug reported on a real device.
            autoComplete="new-password"
            value={fields.password}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onChange={(e) => setField("password", e.target.value)}
            error={!passwordFocused ? errors.password : undefined}
            trailing={
              <button
                type="button"
                // Prevent the password input from blurring on tap: on
                // mobile, blurring closes the keyboard, which resizes the
                // viewport under the user's finger between touchstart and
                // touchend — the browser then cancels the click entirely,
                // so onClick silently never fires (desktop has no keyboard
                // resize, so it always worked there). Blocking the default
                // mousedown/touch focus-change keeps the input focused and
                // the click reliable.

                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                // Bigger hit area (not just the icon) + explicit z-index +
                // touch-manipulation — on a real mobile device the
                // icon-sized-only hit area was too small to reliably tap,
                // and taps could land on the input underneath instead (no
                // visible feedback, looked like "the button doesn't work").
                className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center text-slate-500 hover:text-slate-700"
                tabIndex={-1}
              >
                {showPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
              </button>
            }
          />
          {passwordFocused && <PasswordStrengthChecklist password={fields.password} />}
        </div>
        <AccountInput
          icon={LockSolidIcon}
          label="Confirm your password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={fields.confirmPassword}
          onChange={(e) => setField("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
          trailing={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center text-slate-500 hover:text-slate-700"
              tabIndex={-1}
            >
              {showConfirmPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
            </button>
          }
        />

        <CaptchaField
          schoolUUID={context.schoolUUID}
          value={fields.captcha}
          onChange={(v) => setField("captcha", v)}
          error={errors.captcha}
          cacheBust={captchaCacheBust}
          onRefresh={refreshCaptcha}
        />

        {errors.form && <p className="text-center text-sm font-semibold text-red-600">{errors.form}</p>}

        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-600">
          <Checkbox
            checked={fields.checkTerms}
            onCheckedChange={(checked) => setField("checkTerms", checked === true)}
            className="mt-0.5 shrink-0"
          />
          <span>
            I have read and agree to the{" "}
            <a href={context.termsOfUseUrl} target="_blank" rel="noreferrer" className="text-primary">
              Terms of Use
            </a>
            ,{" "}
            <a href={context.privacyPolicyUrl} target="_blank" rel="noreferrer" className="text-primary">
              Privacy Policy
            </a>
            ,{" "}
            <a href={context.enrollmentPolicyUrl} target="_blank" rel="noreferrer" className="text-primary">
              Service Agreement
            </a>
            ,{" "}
            <a href={context.schoolPolicyUrl} target="_blank" rel="noreferrer" className="text-primary">
              School Policies
            </a>
            , and the{" "}
            <a href={context.studentPolicyUrl} target="_blank" rel="noreferrer" className="text-primary">
              Academic Integrity &amp; Student Code of Conduct
            </a>
          </span>
        </label>
        {errors.checkTerms && <p className="text-xs text-red-600">{errors.checkTerms}</p>}

        <div className="flex justify-center pt-1">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={signup.isPending}
            className="h-11 min-w-[110px] rounded-xl bg-primary px-7 text-[15px] font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            {signup.isPending ? "Please wait…" : "Next"}
          </Button>
        </div>

        <p className="text-center text-sm text-slate-600">
          Already Enrolled?{" "}
          <a href={process.env.NEXT_PUBLIC_BACKEND_BASE_URL + "/international-schooling/common/login"} className="font-semibold text-primary hover:underline">
            Log in here.
          </a>
        </p>
      </form>

      <FlaggedSeatsModal
        open={!!flaggedModal}
        onOpenChange={(open) => !open && setFlaggedModal(null)}
        schoolName={flaggedModal?.schoolName}
        sessionName={flaggedModal?.sessionName}
      />

      <InfoModal open={!!welcomeBackModal} onOpenChange={(open) => !open && setWelcomeBackModal(null)}>
        {welcomeBackModal &&
          getWelcomeBackMessage({ ...welcomeBackModal, loginHref: context.loginUrl })}
      </InfoModal>
    </>
  );
}
