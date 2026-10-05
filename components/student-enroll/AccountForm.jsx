"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { AccountInput } from "@/components/student-enroll/AccountInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PasswordStrengthChecklist } from "@/components/student-enroll/PasswordStrengthChecklist";
import { CaptchaField } from "@/components/student-enroll/CaptchaField";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { InfoModal, getWelcomeBackMessage } from "@/components/student-enroll/InfoModal";
import { useAccountSignup } from "@/hooks/useAccountSignup";
import { checkEmailAvailability } from "@/services/studentSignupBackendApi";
import { validateAccountFormOnline, isValidEmail, getPasswordStrength } from "@/utils/studentSignupValidation";
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
  const [fields, setFields] = useState(() => ({
    ...INITIAL_FIELDS,
    email: context?.username || "",
    confirmEmail: context?.username || "",
    referralCode: context?.referralCode || "",
  }));
  const [errors, setErrors] = useState({});
  // Per-field "has the user interacted with this yet" flag — a field's own
  // live validity check (below) only renders as a red error once it's been
  // touched (blurred, or a submit was attempted), matching the previous
  // "only show after Next" UX. Once shown though, every error here is
  // recomputed live from `fields` on every render, so fixing the value
  // clears the red state immediately — no second blur/click needed.
  const [touched, setTouched] = useState({});
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
  // const [emailValidatorModal, setEmailValidatorModal] = useState(null); // email-invalid confirm modal disabled
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

  // Mirrors checkPasswordStrength() in jquery.commonFunction.js: the checklist shows from page load
  // while the password is still invalid (it hides once every rule passes); the confirm
  // field is a plain live comparison ("Please re-enter the same password"), silent while empty.
  const passwordIsValid = useMemo(() => getPasswordStrength(fields.password).isValid, [fields.password]);
  const confirmMismatch = fields.confirmPassword.length > 0 && fields.confirmPassword !== fields.password;
  const confirmWeak = fields.confirmPassword.length > 0 && !getPasswordStrength(fields.confirmPassword).isValid;

  // Live per-field validity — recomputed every render from the current
  // `fields` value, so a field clears its red state the instant it becomes
  // valid, without waiting for another blur or a Next click. Each is only
  // ever shown once `touched[field]` is true (set on blur/submit below),
  // so an untouched field stays neutral exactly like before.
  const emailInvalid = !isValidEmail(fields.email);
  const confirmEmailInvalid = !emailsMatch || !isValidEmail(fields.confirmEmail);
  const captchaInvalid = !fields.captcha.trim();
  const checkTermsInvalid = !fields.checkTerms;

  const emailError = touched.email && emailInvalid ? "Please enter a valid email" : undefined;
  const confirmEmailError =
    fields.confirmEmail.trim() && (!emailsMatch || (touched.confirmEmail && confirmEmailInvalid))
      ? "Please re-enter the same email"
      : undefined;
  const captchaError = touched.captcha && captchaInvalid ? "Please enter captcha" : undefined;
  const checkTermsError = touched.checkTerms && checkTermsInvalid ? "Please accept terms and conditions" : undefined;

  function setField(name, value) {
    // "Confirm your email" is hidden from the UI: it always carries the same value as "Enter your
    // email", so the payload and validation (which still expect confirmEmail) keep working.
    setFields((prev) => ({ ...prev, [name]: value, ...(name === "email" ? { confirmEmail: value } : {}) }));
  }

  function touchField(name) {
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }

  function refreshCaptcha() {
    setCaptchaCacheBust(Date.now());
    setField("captcha", "");
  }

  // Mirrors callEmailCheck() in jquery.commonFunction.js, fired on the
  // email field's blur (not on submit). Confirmed at source
  // (CommonUtil.isUserAvailable in is-rest-api):
  //   - status "1" (statusCode "0002", "REQUESTED EMAIL IS AVAILABLE"): no
  //     existing user/parent for this email. If `emailVerified` is false —
  //     the deliverability check couldn't confirm it — the
  //     "appears to be invalid, continue?" confirm (EmailValidatorModal) used
  //     to show; it is currently disabled (commented out below).
  //     If emailVerified is true, there's nothing to show; just continue.
  //   - status "0"/"2" with statusCode 0044/0043/02 ("already registered"/
  //     "declined"): the "Welcome back" modal, same as before.
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

      if (response.status === "1") {
        // EmailValidatorModal disabled: no "appears to be invalid, continue?" confirm.
        // if (!response.emailVerified) {
        //   setEmailValidatorModal({ email: trimmed });
        // }
        return;
      }

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
      const submittedEmail = formData.get("email") || fields.email;
      const domFields = {
        ...fields,
        email: submittedEmail,
        // Confirm-email field is commented out of the UI: reuse the email as its value.
        confirmEmail: submittedEmail,
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

      // Mark every field touched so a first-click Next shows every live
      // error immediately, same as the old one-shot setErrors(...) did —
      // but each one now keeps clearing live afterward instead of staying
      // frozen at whatever validateAccountFormOnline saw at this instant.
      setTouched({ email: true, confirmEmail: true, password: true, confirmPassword: true, captcha: true, checkTerms: true });

      const { valid } = validateAccountFormOnline(domFields);
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
          // Enter / the mobile keyboard's Next key must behave like a normal form: from a text field it moves
          // to the next enabled text field (email -> confirm email -> password -> confirm password -> captcha),
          // and only from the last one does it submit. There is no type="submit" button, so the native
          // behaviour is suppressed here and handled explicitly; the terms checkbox/links are never involved.
          if (e.key === "Enter" && e.target.tagName === "INPUT") {
            e.preventDefault();
            const inputs = [...formRef.current.querySelectorAll("input")].filter(
              (input) => !input.disabled && !["checkbox", "hidden", "radio"].includes(input.type)
            );
            const next = inputs[inputs.indexOf(e.target) + 1];
            if (next) next.focus();
            else handleSubmit(e);
          }
        }}
        className="mx-auto w-full  space-y-5"
      >
        <div className="text-center">
          <h2 className="text-sm md:text-lg font-bold leading-tight text-primary md:text-slate-800">
            Complete your enrollment in just 5 minutes.
          </h2>
        </div>

        <AccountInput
          icon={Mail}
          label="Enter student's email"
          required
          name="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          disabled={Boolean(context?.username)}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={(e) => {
            touchField("email");
            handleEmailBlur(e.target.value);
          }}
          error={emailError}
          status={touched.email && !emailInvalid ? "valid" : undefined}
        />

        {/* Confirm your email — hidden; its value is mirrored from "Enter your email" (see setField).
        <AccountInput
          icon={Mail}
          label="Confirm your email"
          required
          name="confirmEmail"
          type="email"
          autoComplete="off"
          value={fields.confirmEmail}
          disabled={Boolean(context?.username)}
          onChange={(e) => setField("confirmEmail", e.target.value)}
          onBlur={() => touchField("confirmEmail")}
          error={confirmEmailError}
          status={touched.confirmEmail && !confirmEmailInvalid ? "valid" : undefined}
        />
        */}

        <div className="relative">
          <AccountInput
            icon={LockKeyhole}
            label="Enter your password"
            required
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
            onBlur={() => {
              setPasswordFocused(false);
              touchField("password");
            }}
            onChange={(e) => setField("password", e.target.value)}
            error={touched.password && !passwordFocused && !passwordIsValid ? "Please enter a valid password" : undefined}
            status={touched.password && passwordIsValid ? "valid" : undefined}
            trailing={
              <>
              <div className="absolute right-1 top-1/2 z-20">
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="group cursor-pointer absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center text-slate-500 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Eye className="h-[18px] w-[18px]" />
                  ) : (
                    <EyeOff className="h-[18px] w-[18px]" />
                  )}

                  <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {showPassword ? "Hide password" : "Show password"}
                    <span className="absolute right-4 top-full border-4 border-transparent border-t-slate-900" />
                  </span>
                </button>
              </div>
              </>

            }
          />
          {/* Visible from page load, under the field, until every rule is green; then it disappears. */}
          {!passwordIsValid && (
            <PasswordStrengthChecklist password={fields.password} />
          )}
        </div>
        <AccountInput
          icon={LockKeyhole}
          label="Confirm your password"
          required
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={fields.confirmPassword}
          onChange={(e) => setField("confirmPassword", e.target.value)}
          onBlur={() => touchField("confirmPassword")}
          error={confirmMismatch || (errors.confirmPassword && confirmWeak) ? "Please re-enter the same password" : undefined}
          status={
            touched.confirmPassword && fields.confirmPassword.length > 0 && !confirmMismatch && !confirmWeak
              ? "valid"
              : undefined
          }
          trailing={
            <>
              <div className="absolute right-1 top-1/2 z-20">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="group cursor-pointer absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center text-slate-500 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
                  <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {showConfirmPassword ? "Hide password" : "Show password"}
                    <span className="absolute right-4 top-full border-4 border-transparent border-t-slate-900" />
                  </span>
                </button>
              </div>
            </>
            
          }
        />

        <CaptchaField
          schoolUUID={context.schoolUUID}
          value={fields.captcha}
          onChange={(v) => setField("captcha", v)}
          onBlur={() => touchField("captcha")}
          error={captchaError}
          cacheBust={captchaCacheBust}
          onRefresh={refreshCaptcha}
        />

        {errors.form && <p className="text-center text-sm font-semibold text-red-600">{errors.form}</p>}

        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-600">
          <Checkbox
            checked={fields.checkTerms}
            onCheckedChange={(checked) => {
              setField("checkTerms", checked === true);
              touchField("checkTerms");
            }}
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
        {checkTermsError && <p className="text-xs text-red-600">{checkTermsError}</p>}

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
          Already have an account?{" "}
          <a href={process.env.NEXT_PUBLIC_BACKEND_BASE_URL +"/"+ context.schoolUUID+"/common/login"} className="font-semibold text-primary hover:underline">
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

      {/* EmailValidatorModal disabled — "appears to be invalid, continue?" confirm no longer shown.
      <EmailValidatorModal
        open={!!emailValidatorModal}
        onOpenChange={(open) => !open && setEmailValidatorModal(null)}
        email={emailValidatorModal?.email}
        onContinue={() => {
          // Mirrors validMailPermission(true): keep the typed email as-is.
          setFields((prev) => ({ ...prev, confirmEmail: emailValidatorModal?.email ?? prev.confirmEmail }));
          setEmailValidatorModal(null);
        }}
        onChangeEmail={() => {
          // Mirrors validMailPermission(false): clear both email fields so
          // the student re-enters a different address.
          lastCheckedEmailRef.current = "";
          setFields((prev) => ({ ...prev, email: "", confirmEmail: "" }));
          setEmailValidatorModal(null);
        }}
      />
      */}
    </>
  );
}
