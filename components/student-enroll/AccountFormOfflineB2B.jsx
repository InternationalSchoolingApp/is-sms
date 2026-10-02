"use client";

import { useState } from "react";
import { Mail, GraduationCap } from "lucide-react";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { Button } from "@/components/ui/button";
import { useAccountSignup } from "@/hooks/useAccountSignup";
import { validateAccountFormOfflineB2B } from "@/utils/studentSignupValidation";
import { getLearningProgramsForSelect } from "@/constant/LearningPrograms";

const LEARNING_PROGRAMS = getLearningProgramsForSelect();

const INITIAL_FIELDS = { communicationEmail: "", learningProgram: "", referralCode: "" };

/**
 * Offline/B2B mode — the counselor/partner-referred signup path
 * (`signupType == 'Offline'` in signupCommon.js), which skips
 * email/password entirely and only requires a learning-program selection.
 * Confirmed in scope for this migration (see the plan doc's decision log).
 */
export function AccountFormOfflineB2B({ context, onRedirect }) {
  const [fields, setFields] = useState(() => ({
    ...INITIAL_FIELDS,
    referralCode: context?.referralCode || "",
  }));
  const [errors, setErrors] = useState({});
  const signup = useAccountSignup({ mode: "offline", context });

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    // No type="submit" button anymore — see AccountForm.jsx for why
    // (real-device native-form-submission bug: iOS Safari reload, Android
    // scroll-jump, both with validation never shown). Keep the same
    // pattern here for consistency even though this form has no password
    // field to trigger Chrome's login-heuristic specifically.
    e?.preventDefault?.();
    e?.stopPropagation?.();

    try {
      const { valid, errors: validationErrors } = validateAccountFormOfflineB2B(fields);
      setErrors(validationErrors);
      if (!valid) return;

      const response = await signup.mutateAsync(fields);
      if (response.status === "0" || response.status === "2") {
        setErrors((prev) => ({ ...prev, form: response.message }));
        return;
      }
      onRedirect?.(response.redirectUrl);
    } catch (err) {
      console.error("AccountFormOfflineB2B submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  return (
    <form
      noValidate
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT") {
          e.preventDefault();
          handleSubmit(e);
        }
      }}
      className="mx-auto w-full max-w-md space-y-5"
    >
      <h2 className="hidden text-center text-xl font-semibold text-primary md:block">Complete the enrollment</h2>

      <FloatingLabelSelect
        icon={GraduationCap}
        label="Select learning program"
        required
        value={fields.learningProgram}
        onValueChange={(v) => setField("learningProgram", v)}
        options={LEARNING_PROGRAMS}
        error={errors.learningProgram}
      />

      <FloatingLabelInput
        icon={Mail}
        label="Email (optional)"
        type="email"
        autoComplete="email"
        value={fields.communicationEmail}
        onChange={(e) => setField("communicationEmail", e.target.value)}
      />

      {errors.form && <p className="text-center text-sm font-semibold text-red-600">{errors.form}</p>}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={signup.isPending}
        className="mx-auto block w-32 rounded-full bg-primary hover:bg-primary/90"
      >
        {signup.isPending ? "Please wait…" : "Next"}
      </Button>
    </form>
  );
}
