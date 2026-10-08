"use client";

import { useState, useEffect, useRef } from "react";
import { User, Briefcase, Mail, MapPin, Map, Building2, Phone as PhoneIcon, GraduationCap, School } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io";
import { MdFamilyRestroom } from "react-icons/md";

import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { Req } from "@/components/common/Req";
import { RequiredAsterisk } from "@/components/common/RequiredAsterisk";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/hooks/useStudentDetailsSignup";
import { useParentDetailsSignup } from "@/hooks/useParentDetailsSignup";
import { validateParentDetails } from "@/utils/studentSignupValidation";
import { nameFieldProps } from "@/utils/nameInput";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import {
  getOtherRelation,
  getPrimaryParentLabels,
  loadOtherParentCache,
  otherBucketFromFields,
  otherFieldsFromBucket,
  primaryBucketFromFields,
  primaryFieldsFromBucket,
  saveOtherParentBucket,
  seedOtherParentFields,
} from "@/utils/parentRelation";

// "Other" is commented out on the is-rest-api form too (masterContent.js
// getRelationshipContent()) -- only these three are actually selectable.
export const RELATION_OPTIONS = [
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Guardian", label: "Guardian" },
];

// SS/CS/WP confirmed at SignupUtil.java's display-name mapping
// (getParentDetails response: SS -> "School Student", CS -> "College
// Student", WP -> "Working Professional").
export const WORKING_PROFESSION_OPTIONS = [
  { value: "SS", label: "School Student" },
  { value: "CS", label: "College Student" },
  { value: "WP", label: "Working Professional" },
];

function defaultFields(studentAddress) {
  return {
    firstName: "",
    lastName: "",
    relation: "",
    contactNumber: "",
    // The phone widget defaults to US when nothing is saved.
    countryCode: "US",
    countryIsdCode: "+1",
    phoneValid: undefined,
    // Optional "other parent" (Mother under Father, Father under Mother) — see utils/parentRelation.js.
    otherFirstName: "",
    otherLastName: "",
    otherContactNumber: "",
    otherCountryCode: "US",
    otherCountryIsdCode: "+1",
    otherPhoneValid: undefined,
    sameAsStudent: Boolean(studentAddress?.countryId),
    countryId: studentAddress?.countryId || "",
    stateId: studentAddress?.stateId || "",
    cityId: studentAddress?.cityId || "",
    communicationWhatsApp: false,
    communicationCall: false,
    communicationEmail: false,
    workingProfession: "",
    institutionName: "",
    institutionCountryId: "",
  };
}

/**
 * The relation-driven name / mobile fields of "Parent | Guardian Details", shared by Step 2 and the
 * review screen's Parent edit popup. Port of the "Relation-based Father/Mother/Guardian parent
 * fields" block in signupStudentStage2.js plus getParentDetailsContent() in signupStudentContent.js:
 *
 *  - Relation sits alone on a centred row (max 420px).
 *  - Below it: First Name / Last Name / Mobile Number (mandatory) of whichever person the Relation
 *    names, labelled "Father's First Name" etc. (generic labels until a Relation is chosen).
 *  - Father / Mother also show the OTHER parent's First Name / Last Name / Mobile Number, all
 *    optional; Guardian shows none.
 *  - Switching Relation swaps the values: what was typed for the old person is kept in `buckets`
 *    (in memory for the visit, the other parent also in localStorage — utils/parentRelation.js), and
 *    the new person's values come back (Father -> Mother -> Father returns the original Father).
 *
 * `fields` keeps the SELECTED person in firstName / lastName / contactNumber (unchanged
 * save-parent-details contract) and the other parent in the other* fields.
 */
export function ParentRelationFields({ schoolUUID, userId, fields, setFields, errors, clearErrors }) {
  // Seeded once, on mount, from what the form opened with: the selected relation's values from
  // `fields`, the other Father / Mother from the cache. Only read and mutated in event handlers
  // (handleRelationChange / persistOther), never during render.
  const bucketsRef = useRef({ Father: {}, Mother: {}, Guardian: {} });
  useEffect(() => {
    const seeded = { Father: {}, Mother: {}, Guardian: {} };
    if (seeded[fields.relation]) seeded[fields.relation] = primaryBucketFromFields(fields);
    const cached = loadOtherParentCache(schoolUUID, userId);
    ["Father", "Mother"].forEach((key) => {
      if (key !== fields.relation && cached[key]) seeded[key] = cached[key];
    });
    bucketsRef.current = seeded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labels = getPrimaryParentLabels(fields.relation);
  const otherRelation = getOtherRelation(fields.relation);

  // persistOtherParentFieldsToCache(): keep the other parent across a refresh.
  function persistOther(nextFields) {
    if (!otherRelation) return;
    const bucket = otherBucketFromFields(nextFields);
    bucketsRef.current[otherRelation] = bucket;
    saveOtherParentBucket(schoolUUID, userId, otherRelation, bucket);
  }

  // onParentRelationChanged()
  function handleRelationChange(newRelation) {
    const buckets = bucketsRef.current;
    const oldRelation = fields.relation;
    if (oldRelation && buckets[oldRelation]) buckets[oldRelation] = primaryBucketFromFields(fields);
    if (getOtherRelation(oldRelation)) persistOther(fields);

    // Choosing a Relation for the first time keeps anything already typed instead of blanking it.
    const keepTyped = !oldRelation && !buckets[newRelation]?.firstName && !buckets[newRelation]?.lastName && !buckets[newRelation]?.contactNumber;
    const nextOther = getOtherRelation(newRelation);
    setFields((prev) => ({
      ...prev,
      relation: newRelation,
      ...(keepTyped ? {} : primaryFieldsFromBucket(buckets[newRelation])),
      ...otherFieldsFromBucket(nextOther ? buckets[nextOther] : null),
    }));
    clearErrors?.("relation", "firstName", "lastName", "contactNumber", "otherContactNumber");
  }

  const set = (name, value) => setFields((prev) => ({ ...prev, [name]: value }));

  return (
    <>
      <div className="mt-4.5 sm:mx-auto sm:max-w-[420px]">
        <FloatingLabelSelect
          icon={MdFamilyRestroom}
          label={<Req label="Relationship to Student" required />}
          value={fields.relation}
          onValueChange={handleRelationChange}
          options={RELATION_OPTIONS}
          error={errors.relation}
          searchable
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <FloatingLabelInput
          icon={User}
          label={<Req label={labels.firstName} required />}
          value={fields.firstName}
          {...nameFieldProps((v) => set("firstName", v))}
          error={errors.firstName}
        />
        <FloatingLabelInput
          icon={User}
          label={<Req label={labels.lastName} required />}
          value={fields.lastName}
          {...nameFieldProps((v) => set("lastName", v))}
          error={errors.lastName}
        />
        {/* Remounted per relation: the phone widget only reads its value / country at mount. */}
        <PhoneNumberField
          key={`primary-${fields.relation}`}
          label={<Req label={labels.mobile} required />}
          value={fields.contactNumber}
          className="pb-1.5 w-full"
          initialCountry={(fields.countryCode || "US").toLowerCase()}
          onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
            setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
          }
          error={errors.contactNumber}
        />
      </div>

      {otherRelation && (
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <FloatingLabelInput
            icon={User}
            label={<>{otherRelation}&apos;s First Name <span className="text-black">(Optional)</span></>}
            value={fields.otherFirstName}
            {...nameFieldProps((v) => set("otherFirstName", v))}
            onBlur={() => persistOther(fields)}
          />
          <FloatingLabelInput
            icon={User}
            label={<>{otherRelation}&apos;s Last Name <span className="text-black">(Optional)</span></>}
            value={fields.otherLastName}
            {...nameFieldProps((v) => set("otherLastName", v))}
            onBlur={() => persistOther(fields)}
          />
          <PhoneNumberField
            key={`other-${fields.relation}`}
            label={<>{otherRelation}&apos;s Mobile Number <span className="text-black">(Optional)</span></>}
            value={fields.otherContactNumber}
            className="pb-1.5 w-full"
            initialCountry={(fields.otherCountryCode || "US").toLowerCase()}
            onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
              setFields((prev) => ({
                ...prev,
                otherContactNumber: contactNumber,
                otherCountryIsdCode: countryIsdCode,
                otherCountryCode: countryCode,
                otherPhoneValid: contactNumber ? isValid : undefined,
              }))
            }
            error={errors.otherContactNumber}
          />
        </div>
      )}
    </>
  );
}

/**
 * Stage 2 of the enrollment wizard ("Parent information"). Mirrors
 * signupStudentStage2.js / SignupStudentUtil.saveSignupParent() — for
 * ONE_TO_ONE_FLEX, the normal parent-relationship fields are replaced
 * entirely by workingProfession/institutionName/institutionCountryId
 * (confirmed at SignupStudentUtil.java:2478, saved onto the Student entity,
 * not Parents). Parent email and phone are both optional here, matching the
 * "(Optional)" labels on the live is-rest-api form — no OTP verification
 * gate on submit.
 *
 * `studentAddress` (countryId/stateId/cityId from Stage 1) seeds the "same
 * as student" default — purely a client-side convenience copy, there's no
 * backend flag for it (confirmed: SignupUtil.convertToSignupParentsDTO only
 * defaults the parent's location from the student on first visit, same idea).
 * Displayed as a "Change your Location" checkbox (matches legacy's own
 * #sameAsStudentLocation naming — see signupStudentStage1.js's
 * syncParentLocationWithStudent doc comment) — UNCHECKED (fields.sameAsStudent
 * true) is the default, showing the student's own country/state/city
 * read-only; checking it clears and unlocks them for a different address.
 * The underlying field is still `sameAsStudent`/true-means-same internally
 * (validation, submit payload) — only the checkbox's displayed
 * checked-state and label are inverted to match the reference design.
 *
 * `initialFields`, when given (Back from Stage 3, or a refresh), overrides
 * those defaults with whatever was last saved via
 * utils/wizardStorage.js's saveWizardParentFields — the same
 * save/reload-on-mount pattern Stage 1 uses for its own fields.
 */
export function Stage2ParentDetails({ context, userId, studentAddress, courseProviderId, initialFields, onNext, onBack }) {
  const [fields, setFields] = useState(() =>
    seedOtherParentFields({ ...defaultFields(studentAddress), ...initialFields }, context.schoolUUID, userId)
  );
  const [errors, setErrors] = useState({});
  const [flaggedModal, setFlaggedModal] = useState(null);
  // Every field name that has ever shown an error this session (set grows,
  // never shrinks) — see the live-revalidation effect below for why this is
  // needed separately from `errors` itself.
  const everErroredFieldsRef = useRef(new Set());

  const isOneToOneFlex = getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX";

  const signup = useParentDetailsSignup({ context, userId, isOneToOneFlex });
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);

  // Re-checks every field that currently shows an error OR has ever shown
  // one this session, against the same validator handleSubmit uses — so a
  // message clears (and the field turns green) as soon as the value becomes
  // valid, AND comes back if the user then re-invalidates it (e.g. clears a
  // field they'd just fixed), instead of only ever being able to clear.
  // `keys` must come from everErroredFieldsRef, not just `Object.keys(prev)`:
  // once a field's error is deleted from `prev` it would otherwise never be
  // re-checked again even if it becomes invalid a second time.
  useEffect(() => {
    setErrors((prev) => {
      const keys = [...everErroredFieldsRef.current];
      if (keys.length === 0) return prev;
      const { errors: current } = validateParentDetails(fields, { isOneToOneFlex });
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
  }, [fields, isOneToOneFlex]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  // Drops stale validation messages for the given fields (their value just changed).
  function clearErrors(...names) {
    setErrors((prev) => {
      if (!names.some((name) => prev[name])) return prev;
      const next = { ...prev };
      names.forEach((name) => delete next[name]);
      return next;
    });
  }

  function toggleSameAsStudent(checked) {
    // Location values are replaced wholesale (prefilled or blanked), so earlier location errors are stale.
    clearErrors("countryId", "stateId", "cityId");
    setFields((prev) => ({
      ...prev,
      sameAsStudent: checked,
      countryId: checked ? studentAddress?.countryId || "" : "",
      stateId: checked ? studentAddress?.stateId || "" : "",
      cityId: checked ? studentAddress?.cityId || "" : "",
    }));
  }

  async function handleSubmit() {
    const { valid, errors: fieldErrors } = validateParentDetails(fields, { isOneToOneFlex });
    Object.keys(fieldErrors).forEach((key) => everErroredFieldsRef.current.add(key));
    setErrors(fieldErrors);
    if (!valid) return;

    try {
      const response = await signup.mutateAsync(fields);

      if (response?.status === "0" || response?.status === "2") {
        if (response.statusCode === "FLAGGED") {
          setFlaggedModal({ schoolName: context.schoolName, sessionName: response.message });
          return;
        }
        setErrors((prev) => ({ ...prev, form: response.message || "Something went wrong. Please try again." }));
        return;
      }
      if (!response) {
        setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
        return;
      }

      onNext?.(fields);
    } catch (err) {
      console.error("Stage2ParentDetails submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  // getParentDetailsContent() in signupStudentContent.js: provider 39 first, then the FLEX program.
  // The default keeps this screen's own "Parents Details" title.
  const heading =
    Number(courseProviderId) === 39
      ? "Communication Details"
      : isOneToOneFlex
        ? "Academic & Communication Details"
        : "Parent|Guardian Details";

  const locationDisabled = fields.sameAsStudent;

  return (
    <div className={`mx-auto mt-6 ${isOneToOneFlex ? "max-w-7xl" : "max-w-7xl"} rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-12`}>
      <h2 className="text-center text-xl font-bold text-black md:text-2xl">{heading}</h2>

      {isOneToOneFlex ? (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <FloatingLabelSelect
            icon={GraduationCap}
            label={<Req label="Are you a student or a working professional?" required />}
            className="sm:col-span-2 lg:col-span-1"
            value={fields.workingProfession}
            onValueChange={(v) => setField("workingProfession", v)}
            options={WORKING_PROFESSION_OPTIONS}
            error={errors.workingProfession}
          />
          <FloatingLabelInput
            icon={School}
            label={<Req label="School / College / Organization Name" required />}
            value={fields.institutionName}
            onChange={(e) => setField("institutionName", e.target.value)}
            error={errors.institutionName}
          />
          <FloatingLabelSelect
            icon={MapPin}
            label={<Req label="Country of School / College / Organization" required />}
            value={fields.institutionCountryId}
            onValueChange={(v) => setField("institutionCountryId", v)}
            options={countries.data || []}
            error={errors.institutionCountryId}
            searchable
          />
        </div>
      ) : (
        <>
          <ParentRelationFields
            schoolUUID={context.schoolUUID}
            userId={userId}
            fields={fields}
            setFields={setFields}
            errors={errors}
            clearErrors={clearErrors}
          />

          <label className="mt-8 mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-black">
            <Checkbox checked={!fields.sameAsStudent} onCheckedChange={(v) => toggleSameAsStudent(!v)} />
            Edit Location
          </label>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelSelect
              icon={MapPin}
              label={
                <Req
                  label={
                    <>
                      Country{" "}
                      <span className="text-black">(Parent&apos;s Current Location)</span>
                    </>
                  }
                  required
                />
              }
              value={fields.countryId}
              onValueChange={(v) => {
                setFields((prev) => ({ ...prev, countryId: v, stateId: "", cityId: "" }));
                clearErrors("countryId");
              }}
              options={countries.data || []}
              error={errors.countryId}
              disabled={locationDisabled}
              searchable
            />
            <FloatingLabelSelect
              icon={Map}
              label={<Req label="Province / State" required />}
              value={fields.stateId}
              onValueChange={(v) => {
                setFields((prev) => ({ ...prev, stateId: v, cityId: "" }));
                clearErrors("stateId");
              }}
              options={states.data || []}
              error={errors.stateId}
              disabled={locationDisabled}
              searchable
            />
            <FloatingLabelSelect
              icon={Building2}
              label={<Req label="City" required />}
              value={fields.cityId}
              onValueChange={(v) => {
                setField("cityId", v);
                clearErrors("cityId");
              }}
              options={cities.data || []}
              error={errors.cityId}
              disabled={locationDisabled}
              searchable
            />
          </div>

        </>
      )}

      {/* getParentDetailsContent() appends this after every variant (Communication Details,
          Academic & Communication Details, Parent | Guardian Details). */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <h3 className="text-base font-bold text-black">Preferred Contact Method <RequiredAsterisk /></h3>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <IoLogoWhatsapp className="h-4 w-4 text-emerald-600" />
            WhatsApp
            <Checkbox
              checked={fields.communicationWhatsApp}
              onCheckedChange={(v) => setField("communicationWhatsApp", Boolean(v))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <PhoneIcon className="h-4 w-4 text-black" />
            Call
            <Checkbox
              checked={fields.communicationCall}
              onCheckedChange={(v) => setField("communicationCall", Boolean(v))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <Mail className="h-4 w-4 text-black" />
            Email
            <Checkbox
              checked={fields.communicationEmail}
              onCheckedChange={(v) => setField("communicationEmail", Boolean(v))}
            />
          </label>
        </div>
      </div>
      {errors.communication && <p className="mt-2 text-center text-xs text-red-600">{errors.communication}</p>}

      {errors.form && <p className="mt-4 text-center text-sm font-semibold text-red-600">{errors.form}</p>}

      <MobileActionBar context={context} className="md:mt-10 md:pt-6">
        {onBack && (
          <Button type="button" variant="outline"  className="cursor-pointer" onClick={onBack} disabled={signup.isPending}>
            Back
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={signup.isPending} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
          {signup.isPending ? "Please wait…" : "Next"}
        </Button>
      </MobileActionBar>

      <FlaggedSeatsModal
        open={!!flaggedModal}
        onOpenChange={(open) => !open && setFlaggedModal(null)}
        schoolName={flaggedModal?.schoolName}
        sessionName={flaggedModal?.sessionName}
      />
    </div>
  );
}
