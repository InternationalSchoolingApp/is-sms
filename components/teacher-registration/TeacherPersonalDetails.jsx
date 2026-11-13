"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Cake, Mail, Map, MapPin, User, VenusAndMars } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { Req } from "@/components/common/Req";
import { useCityOptions, useCountryOptions, useStateOptions } from "@/hooks/useStudentDetailsSignup";
import { useTeacherBasicDetailsSave } from "@/hooks/useTeacherSignup";
import {
  TEACHER_GENDER_OPTIONS,
  getTeacherDobPickerBounds,
  teacherNameFieldProps,
  validateTeacherPersonalDetails,
} from "@/utils/teacherSignupValidation";

// The school whose teachers always register from one country: its country select is locked once a country is saved
// (the legacy page did the same, client-side only: there is no server rule).
const COUNTRY_LOCKED_SCHOOL_ID = 5;

const INITIAL_FIELDS = {
  firstName: "",
  // Not shown (as in the student form), but kept: a teacher who saved a middle name on the legacy page keeps it,
  // because the backend rewrites the field on every save.
  middleName: "",
  lastName: "",
  dob: null, // a Date object: the DatePicker works with Date, not a string
  gender: "",
  countryId: "",
  stateId: "",
  cityId: "",
  communicationEmail: "",
  contactNumber: "",
  countryCode: "", // intl-tel-input's names: ISO2 in upper case ...
  countryIsdCode: "", // ... and the dial code with its "+"
  phoneValid: undefined,
};

// Gray placeholder block matching one field's footprint, shown while the countries list loads.
function FieldSkeleton() {
  return <div className="h-12 w-full animate-pulse rounded-md bg-slate-100" />;
}

function PersonalDetailsSkeleton() {
  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-bold text-black md:text-2xl">Personal Details</h2>
      <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Step 1 of the teacher registration ("Personal details"): name, date of birth (18-99), gender, the account's
 * e-mail (read-only), phone, and country / state / city. Content only: rendered inside the wizard shell by
 * app/[school]/teacher-registration/step/personal-details. Modelled on the student Stage1StudentDetails; the field
 * contract is the legacy page's (teacher/signup/save-basic-details), see hooks/useTeacherSignup.js.
 *
 * `initialFields` is read at mount only (the phone widget, too), so the container resolves the saved record first.
 */
export function TeacherPersonalDetails({ context, userId, initialFields, onNext }) {
  const [fields, setFields] = useState(() => ({ ...INITIAL_FIELDS, ...initialFields }));
  const [errors, setErrors] = useState({});
  // Every field that has ever shown an error this session (it only grows): a field is re-checked live while it is
  // in here, so its message clears when the value becomes valid and comes back if it is made invalid again.
  const everErroredFieldsRef = useRef(new Set());

  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);
  const save = useTeacherBasicDetailsSave({ context, userId });
  const dobBounds = getTeacherDobPickerBounds();
  const countryLocked = Number(context.schoolNumericId) === COUNTRY_LOCKED_SCHOOL_ID && Boolean(initialFields?.countryId);

  useEffect(() => {
    setErrors((prev) => {
      const keys = [...everErroredFieldsRef.current];
      if (keys.length === 0) return prev;
      const { errors: current } = validateTeacherPersonalDetails(fields);
      const next = { ...prev };
      let changed = false;
      keys.forEach((key) => {
        if (!current[key]) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        } else if (current[key] !== prev[key]) {
          next[key] = current[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fields]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function setCountry(countryId) {
    setFields((prev) => ({ ...prev, countryId, stateId: "", cityId: "" }));
  }

  function setState(stateId) {
    setFields((prev) => ({ ...prev, stateId, cityId: "" }));
  }

  async function handleSubmit() {
    if (save.isPending) return;
    const { valid, errors: fieldErrors } = validateTeacherPersonalDetails(fields);
    Object.keys(fieldErrors).forEach((key) => everErroredFieldsRef.current.add(key));
    setErrors(fieldErrors);
    if (!valid) return;

    try {
      const response = await save.mutateAsync(fields);
      if (!response) {
        setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
        return;
      }
      // Branch on statusCode: validation failures answer a message with no status at all.
      if (response.statusCode !== "SUCCESS") {
        setErrors((prev) => ({ ...prev, form: response.message || "Something went wrong. Please try again." }));
        return;
      }
      onNext?.(fields);
    } catch (err) {
      console.error("TeacherPersonalDetails submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  if (!countries.isSuccess) {
    return <PersonalDetailsSkeleton />;
  }

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Personal Details</h2>

      {/* Row 1: first name, last name, email. Row 2: date of birth, gender, mobile. Row 3: country, state, city. */}
      <div className="mt-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <FloatingLabelInput
          icon={User}
          label={<Req label="First Name" required />}
          value={fields.firstName}
          {...teacherNameFieldProps((v) => setField("firstName", v))}
          error={errors.firstName}
        />
        <FloatingLabelInput
          icon={User}
          label={<Req label="Last Name" required />}
          value={fields.lastName}
          {...teacherNameFieldProps((v) => setField("lastName", v))}
          error={errors.lastName}
        />
        <FloatingLabelInput
          icon={Mail}
          label={<Req label="Email" required />}
          type="email"
          value={fields.communicationEmail}
          onChange={(e) => setField("communicationEmail", e.target.value)}
          disabled
          inputClassName="text-black/90 disabled:text-black disabled:opacity-100"
        />
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <DatePicker
          height="h-12"
          icon={Cake}
          label={
            <Req
              label={
                <>
                  Date of Birth <span className="text-[12px] text-black">(Month Day, Year)</span>
                </>
              }
              required
            />
          }
          value={fields.dob}
          onChange={(v) => setField("dob", v)}
          fromDate={dobBounds.fromDate}
          toDate={dobBounds.toDate}
          error={errors.dob}
        />
        <FloatingLabelSelect
          icon={VenusAndMars}
          label={<Req label={fields.gender ? "Selected Gender" : "Select Gender"} required />}
          value={fields.gender}
          onValueChange={(v) => setField("gender", v)}
          options={TEACHER_GENDER_OPTIONS}
          error={errors.gender}
          searchable
        />
        <PhoneNumberField
          label={<Req label="Mobile Number" required />}
          value={fields.contactNumber}
          className="w-full pb-1.5"
          // Only takes effect at mount (see useIntlTelInput): restores the saved country flag.
          initialCountry={initialFields?.countryCode ? initialFields.countryCode.toLowerCase() : undefined}
          onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
            setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
          }
          error={errors.contactNumber}
        />
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <FloatingLabelSelect
          icon={MapPin}
          label={<Req label="Country" required />}
          value={fields.countryId}
          onValueChange={setCountry}
          options={countries.data || []}
          error={errors.countryId}
          disabled={countryLocked}
          // the searchable select has no disabled state
          searchable={!countryLocked}
        />
        <FloatingLabelSelect
          icon={Map}
          label={<Req label="Province / State" required />}
          value={fields.stateId}
          onValueChange={setState}
          options={states.data || []}
          error={errors.stateId}
          searchable
        />
        <FloatingLabelSelect
          icon={Building2}
          label={<Req label="City" required />}
          value={fields.cityId}
          onValueChange={(v) => setField("cityId", v)}
          options={cities.data || []}
          error={errors.cityId}
          searchable
        />
      </div>

      {errors.form && <p className="mt-4 text-center text-sm font-semibold text-red-600">{errors.form}</p>}

      <MobileActionBar context={null} className="md:mt-10">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={save.isPending}
          className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90"
        >
          {save.isPending ? "Please wait…" : "Next"}
        </Button>
      </MobileActionBar>
    </div>
  );
}
