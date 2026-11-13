"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Script from "next/script";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { AccountInput } from "@/components/student-enroll/AccountInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PasswordStrengthChecklist } from "@/components/student-enroll/PasswordStrengthChecklist";
import { TeacherEmailStatusModal } from "@/components/teacher-registration/TeacherEmailModals";
import { useTeacherAccountSignup } from "@/hooks/useTeacherSignup";
import { checkTeacherEmailAvailability } from "@/services/teacherSignupApi";
import { validateTeacherAccountForm } from "@/utils/teacherSignupValidation";
import { getPasswordStrength, isValidEmail } from "@/utils/studentSignupValidation";
import { buildAuthentication } from "@/utils/authentication";
import { callLocationForPaymentPromise, getLocationValue, loadLocationGlobals } from "@/utils/locationFinder";

// The action the reCAPTCHA token is minted for; services/teacherSignupApi.js verifies the same one.
const RECAPTCHA_ACTION = "teacher_signup";

const INITIAL_FIELDS = {
  email: "",
  confirmEmail: "",
  password: "",
  confirmPassword: "",
  checkTerms: false,
  location: "{}",
};

// is-user-available statusCodes that mean "this e-mail already has an account": enabled / not verified / declined.
const EXISTING_ACCOUNT_CODES = ["0044", "0043", "02"];
const DELETED_ACCOUNT_CODE = "0042";

function PasswordToggle({ shown, onToggle, preventBlur = false }) {
  const label = shown ? "Hide password" : "Show password";
  return (
    <div className="absolute right-1 top-1/2 z-20">
      <button
        type="button"
        onMouseDown={preventBlur ? (e) => e.preventDefault() : undefined}
        onClick={onToggle}
        aria-label={label}
        className="group cursor-pointer absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center text-slate-500 hover:text-slate-700"
        tabIndex={-1}
      >
        {shown ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          {label}
          <span className="absolute right-4 top-full border-4 border-transparent border-t-slate-900" />
        </span>
      </button>
    </div>
  );
}

/**
 * The teacher account-creation form (stage 1): e-mail twice, a password twice, the terms box, and an invisible
 * reCAPTCHA v3 in production. Modelled on the student AccountForm (components/student-enroll/AccountForm.jsx), with
 * the differences a teacher needs: there is no captcha number, the e-mail
 * availability check is for the TEACHER user type, and its prompts are teacher-worded.
 *
 * On success the backend answers a redirectUrl (the school's SSO link into this app, signed in as the new teacher),
 * which the page follows whether or not the address could be verified.
 */
export function TeacherAccountForm({ context, canSubmit = false, recaptchaRequired = false, recaptchaSiteKey, onRedirect }) {
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [errors, setErrors] = useState({});
  // A field's own live validity only shows as an error once it has been touched (blurred, or a submit was
  // attempted); after that it is recomputed on every render, so fixing the value clears it at once.
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailStatusModal, setEmailStatusModal] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const formRef = useRef(null);
  // Avoids re-firing the availability check when the e-mail field blurs without its value changing.
  const lastCheckedEmailRef = useRef("");

  const signup = useTeacherAccountSignup({ context });

  // Capture the visitor's location on load and keep it in the hidden `location` field, as the student form and the
  // legacy page do (the backend derives the account's timezone from it; an empty one falls back to Asia/Singapore).
  useEffect(() => {
    let cancelled = false;
    loadLocationGlobals({ schoolUUID: context.schoolUUID, userId: 0 })
      .catch((err) => console.error("Location globals failed (using the constant location):", err))
      .then(() => callLocationForPaymentPromise())
      .then(() => {
        if (cancelled) return;
        setFields((prev) => ({ ...prev, location: getLocationValue() || "{}" }));
      })
      .catch((err) => console.error("Location capture failed:", err));
    return () => {
      cancelled = true;
    };
  }, [context.schoolUUID]);

  const passwordIsValid = useMemo(() => getPasswordStrength(fields.password).isValid, [fields.password]);
  const confirmMismatch = fields.confirmPassword.length > 0 && fields.confirmPassword !== fields.password;
  const confirmWeak = fields.confirmPassword.length > 0 && !getPasswordStrength(fields.confirmPassword).isValid;

  const emailInvalid = !isValidEmail(fields.email);
  const emailError = touched.email && emailInvalid ? "Please enter a valid email" : undefined;
  const checkTermsError = touched.checkTerms && !fields.checkTerms ? "Please accept terms and conditions" : undefined;

  function setField(name, value) {
    // "Confirm your email" is not shown (as in the student sign-up): it always carries the same value as "Enter your
    // email", so the payload and validation, which still expect confirmEmail, keep working.
    setFields((prev) => ({ ...prev, [name]: value, ...(name === "email" ? { confirmEmail: value } : {}) }));
  }

  function touchField(name) {
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }

  // Fired on the e-mail field's blur (not on submit). is-user-available answers
  //   status "1" (0002): free, nothing to show (`emailVerified` is not used: see TeacherEmailModals.jsx);
  //   status "0"/"2" with 0044/0043/02: already has an account -> "Welcome back, log in"; 0042: deleted -> its message.
  async function handleEmailBlur(email) {
    if (!canSubmit) return;
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed) || trimmed === lastCheckedEmailRef.current) return;
    lastCheckedEmailRef.current = trimmed;

    try {
      const response = await checkTeacherEmailAvailability(context.schoolUUID, {
        authentication: buildAuthentication(context, "TEACHER"),
        data: { requestKey: "EMAIL-AVAILABLE", email: trimmed },
      });
      if (!response) return;

      if (response.status === "1") return;
      if (response.status === "0" || response.status === "2") {
        if (EXISTING_ACCOUNT_CODES.includes(response.statusCode)) {
          setEmailStatusModal({ msgFlag: response.fr, extra1: response.extra1 });
        } else if (response.statusCode === DELETED_ACCOUNT_CODE) {
          setEmailStatusModal({ useMessage: true, message: response.message });
        }
      }
    } catch (err) {
      console.error("checkTeacherEmailAvailability failed:", err);
    }
  }

  async function handleSubmit(e) {
    // A plain button with onClick (never a native form submit): a tap before React has hydrated would otherwise
    // submit the form natively and reload the page, which preventDefault in our own handler cannot stop.
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!canSubmit || signup.isPending || redirecting) return;

    try {
      // Read the REAL values from the DOM: browser/WebView autofill can set an input's value without firing the
      // input event React listens for, so state alone can stay "" while the field visibly has text.
      const formData = new FormData(formRef.current);
      await callLocationForPaymentPromise({ throwOnError: true }).catch((err) => {
        console.error("Location refresh failed (using the one captured on load):", err);
      });
      const submittedEmail = formData.get("email") || fields.email;
      const domFields = {
        ...fields,
        location: getLocationValue() || fields.location,
        email: submittedEmail,
        confirmEmail: submittedEmail,
        password: (formData.get("password") || fields.password).replace(/ /g, ""),
        confirmPassword: (formData.get("confirmPassword") || fields.confirmPassword).replace(/ /g, ""),
      };
      setFields(domFields);
      setTouched({ email: true, password: true, confirmPassword: true, checkTerms: true });

      const { valid, errors: fieldErrors } = validateTeacherAccountForm(domFields);
      setErrors(fieldErrors);
      if (!valid) return;

      let recaptchaToken;
      if (recaptchaRequired) {
        if (!recaptchaSiteKey || !window.grecaptcha) {
          setErrors((prev) => ({ ...prev, form: "Security verification is unavailable. Please refresh the page and try again." }));
          return;
        }
        recaptchaToken = await new Promise((resolve, reject) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(recaptchaSiteKey, { action: RECAPTCHA_ACTION }).then(resolve).catch(reject);
          });
        });
      }

      const response = await signup.mutateAsync({ ...domFields, ...(recaptchaToken ? { recaptchaToken } : {}) });
      if (!response) {
        setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
        return;
      }

      if (response.status === "0" || response.status === "2") {
        if (response.statusCode === "0001") {
          // already registered
          setEmailStatusModal({ msgFlag: response.fr, extra1: response.extra1 });
          return;
        }
        setErrors((prev) => ({ ...prev, form: response.message || "Something went wrong. Please try again." }));
        return;
      }

      if (response.redirectUrl) {
        setRedirecting(true);
        onRedirect?.(response.redirectUrl);
      } else {
        setErrors((prev) => ({ ...prev, form: "Your account was created, but we could not sign you in. Please log in to continue." }));
      }
    } catch (err) {
      // Any thrown step (network error, unreachable backend, ...) must still show something.
      console.error("TeacherAccountForm submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  const busy = signup.isPending || redirecting;

  return (
    <>
      {recaptchaRequired && recaptchaSiteKey && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`}
          strategy="afterInteractive"
        />
      )}
      <form
        ref={formRef}
        noValidate
        onKeyDown={(e) => {
          // Enter / the mobile keyboard's Next key moves to the next text field, and only from the last one submits
          // (there is no type="submit" button, so the native behaviour is handled here).
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
        className="mx-auto w-full space-y-5"
      >
        <input type="hidden" name="location" id="location" value={fields.location} readOnly />

        <AccountInput
          icon={Mail}
          label="Enter your email"
          filledLabel="Your Email"
          required
          name="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={(e) => {
            touchField("email");
            handleEmailBlur(e.target.value);
          }}
          error={emailError}
          status={touched.email && !emailInvalid ? "valid" : undefined}
        />

        <div className="relative">
          <AccountInput
            icon={LockKeyhole}
            label="Enter your password"
            filledLabel="Your Password"
            required
            name="password"
            type={showPassword ? "text" : "password"}
            // "new-password" tells the browser this is a SIGNUP form, not a login, so it does not autofill-submit.
            autoComplete="new-password"
            value={fields.password}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => {
              setPasswordFocused(false);
              touchField("password");
            }}
            onKeyDown={(e) => {
              if (e.key === " ") e.preventDefault();
            }}
            onChange={(e) => setField("password", e.target.value.replace(/ /g, ""))}
            error={touched.password && !passwordFocused && !passwordIsValid ? "Please enter a valid password" : undefined}
            status={touched.password && passwordIsValid ? "valid" : undefined}
            trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          />
          {/* Visible from page load, under the field, until every rule is green; then it disappears. */}
          {!passwordIsValid && <PasswordStrengthChecklist password={fields.password} />}
        </div>

        <AccountInput
          icon={LockKeyhole}
          label="Confirm your password"
          required
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={fields.confirmPassword}
          onKeyDown={(e) => {
            if (e.key === " ") e.preventDefault();
          }}
          onChange={(e) => setField("confirmPassword", e.target.value.replace(/ /g, ""))}
          onBlur={() => touchField("confirmPassword")}
          error={confirmMismatch || (errors.confirmPassword && confirmWeak) ? "Please re-enter the same password" : undefined}
          status={
            touched.confirmPassword && fields.confirmPassword.length > 0 && !confirmMismatch && !confirmWeak
              ? "valid"
              : undefined
          }
          trailing={<PasswordToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} preventBlur />}
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
            </a>{" "}
            and{" "}
            <a href={context.privacyPolicyUrl} target="_blank" rel="noreferrer" className="text-primary">
              Privacy Policy
            </a>
          </span>
        </label>
        {checkTermsError && <p className="text-xs text-red-600">{checkTermsError}</p>}

        {recaptchaRequired && recaptchaSiteKey && (
          <p className="text-center text-[11px] leading-relaxed text-slate-400">
            This site is protected by reCAPTCHA and the Google{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">
              Terms of Service
            </a>{" "}
            apply.
          </p>
        )}

        <div className="flex justify-center pt-1">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="h-11 min-w-[110px] rounded-xl bg-primary px-7 text-[15px] font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            {busy ? "Please wait…" : "Next"}
          </Button>
        </div>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <a href={context.loginUrl} className="font-semibold text-primary hover:underline">
            Log in here.
          </a>
        </p>
      </form>

      <TeacherEmailStatusModal status={emailStatusModal} loginHref={context.loginUrl} onClose={() => setEmailStatusModal(null)} />

    </>
  );
}
