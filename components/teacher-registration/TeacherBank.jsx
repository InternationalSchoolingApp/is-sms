"use client";

import { useState } from "react";
import { Building2, CalendarDays, CreditCard, FileText, Hash, Landmark, Loader2, Mail, Map, MapPin, Phone, User } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { Req } from "@/components/common/Req";
import { useCityOptions, useCountryOptions, useStateOptions } from "@/hooks/useStudentDetailsSignup";
import {
  MAX_ADDRESS_LENGTH,
  MAX_BANK_NAME_LENGTH,
  MAX_BRANCH_NAME_LENGTH,
  MAX_CODE_LENGTH,
  MAX_ACCOUNT_NUMBER_LENGTH,
  MAX_OTHER_DETAILS_LENGTH,
  MAX_PERSON_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_POSTAL_LENGTH,
  TEACHER_BANK_ACCOUNT_CATEGORIES,
  TEACHER_BANK_CURRENCY_CODES,
  firstBankError,
  sanitizeAlphanumeric,
  sanitizeDigits,
  sanitizePersonName,
  validateBankDetails,
} from "@/utils/teacherBank";

const GRID = "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3";
const CURRENCY_OPTIONS = TEACHER_BANK_CURRENCY_CODES.map((code) => ({ value: code, label: code }));
const CATEGORY_OPTIONS = TEACHER_BANK_ACCOUNT_CATEGORIES.map((name) => ({ value: name, label: name }));

function SectionTitle({ children }) {
  return <h3 className="mt-6 text-sm font-extrabold tracking-wide text-black uppercase">{children}</h3>;
}

/**
 * Step 6 ("Account Details"): the bank details as the legacy wizard listed them (account currency, number, IBAN, type;
 * the holder's name, address, place, postal code, phone and e-mail; the bank's name, branch, address, place and postal
 * code; other details and the SWIFT, IFSC and routing codes), with Submit, which completes the registration. There is no
 * Back (nothing before this step can be changed any more) and no proof document (the legacy screen never asked for one).
 *
 * The currency and the account type start unchosen (the legacy page preselected a currency and its account type's
 * placeholder slipped past its own check). The account number and the IBAN are always typed (a saved one is only hinted at,
 * masked): a masked value saved back would overwrite the real one.
 *
 *   initial: { fields, masked } (utils/teacherBank.js mapBankDetails), read at mount only
 *   onSubmit(fields): Promise<boolean> (true = saved; the screen then changes by itself)
 */
export function TeacherBank({ context, initial, onSubmit }) {
  const [fields, setFields] = useState(initial.fields);
  const [attempted, setAttempted] = useState(false); // after the first Submit, every check shows (and updates) live
  const [submitting, setSubmitting] = useState(false);
  const masked = initial.masked;

  const countries = useCountryOptions(context);
  const holderStates = useStateOptions(context, fields.holderCountryId);
  const holderCities = useCityOptions(context, fields.holderStateId);
  const bankStates = useStateOptions(context, fields.bankCountryId);
  const bankCities = useCityOptions(context, fields.bankStateId);

  const errors = attempted ? validateBankDetails(fields).errors : {};

  const set = (name, transform) => (event) => {
    const raw = event?.target ? event.target.value : event;
    setFields((prev) => ({ ...prev, [name]: transform ? transform(raw) : raw }));
  };
  const setCountry = (side) => (countryId) =>
    setFields((prev) => ({ ...prev, [`${side}CountryId`]: countryId, [`${side}StateId`]: "", [`${side}CityId`]: "" }));
  const setState = (side) => (stateId) => setFields((prev) => ({ ...prev, [`${side}StateId`]: stateId, [`${side}CityId`]: "" }));

  async function handleSubmit() {
    if (submitting) return;
    setAttempted(true);
    const { valid, errors: found } = validateBankDetails(fields);
    if (!valid) {
      toast.error(firstBankError(found));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(fields);
    } finally {
      setSubmitting(false);
    }
  }

  const text = (name, label, icon, props = {}) => (
    <FloatingLabelInput
      icon={icon}
      label={props.required ? <Req label={label} required /> : label}
      value={fields[name]}
      onChange={set(name, props.transform)}
      maxLength={props.maxLength}
      error={errors[name]}
    />
  );

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Account Details</h2>

      <SectionTitle>Bank Details</SectionTitle>
      <div className={`mt-3 ${GRID}`}>
        <FloatingLabelSelect
          icon={CalendarDays}
          label={<Req label="Account Currency" required />}
          value={fields.accountCurrency}
          onValueChange={set("accountCurrency")}
          options={CURRENCY_OPTIONS}
          error={errors.accountCurrency}
          searchable
        />
        <div>
          {text("accountNumber", "Account Number", CreditCard, { required: true, maxLength: MAX_ACCOUNT_NUMBER_LENGTH })}
          {masked.accountNumber && <p className="mt-1 pl-2 text-xs text-slate-600">Saved: {masked.accountNumber}. Please enter your full account number again.</p>}
        </div>
        <div>
          {text("iban", "IBAN (If Available)", Hash, { maxLength: MAX_CODE_LENGTH, transform: sanitizeAlphanumeric })}
          {masked.iban && <p className="mt-1 pl-2 text-xs text-slate-600">Saved: {masked.iban}. Please enter your full IBAN again.</p>}
        </div>
        <FloatingLabelSelect
          icon={Landmark}
          label={<Req label="Account Type" required />}
          value={fields.accountCategory}
          onValueChange={set("accountCategory")}
          options={CATEGORY_OPTIONS}
          error={errors.accountCategory}
        />
      </div>

      <SectionTitle>Account Holder Name (As Per Bank Record)</SectionTitle>
      <div className={`mt-3 ${GRID}`}>
        {text("holderFirstName", "First Name", User, { required: true, maxLength: MAX_PERSON_NAME_LENGTH, transform: sanitizePersonName })}
        {text("holderMiddleName", "Middle Name", User, { maxLength: MAX_PERSON_NAME_LENGTH, transform: sanitizePersonName })}
        {text("holderLastName", "Last Name", User, { required: true, maxLength: MAX_PERSON_NAME_LENGTH, transform: sanitizePersonName })}
      </div>
      <div className={`mt-3.5 ${GRID}`}>
        <div className="lg:col-span-3">{text("holderAddress", "Account Holder Address", MapPin, { required: true, maxLength: MAX_ADDRESS_LENGTH })}</div>
        <FloatingLabelSelect
          icon={MapPin}
          label={<Req label="Country" required />}
          value={fields.holderCountryId}
          onValueChange={setCountry("holder")}
          options={countries.data || []}
          error={errors.holderCountryId}
          searchable
        />
        <FloatingLabelSelect
          icon={Map}
          label={<Req label="Province / State" required />}
          value={fields.holderStateId}
          onValueChange={setState("holder")}
          options={holderStates.data || []}
          error={errors.holderStateId}
          searchable
        />
        <FloatingLabelSelect
          icon={Building2}
          label={<Req label="City" required />}
          value={fields.holderCityId}
          onValueChange={set("holderCityId")}
          options={holderCities.data || []}
          error={errors.holderCityId}
          searchable
        />
        {text("holderPostal", "Postal Code", Hash, { required: true, maxLength: MAX_POSTAL_LENGTH })}
        {text("holderPhone", "Phone No.", Phone, { required: true, maxLength: MAX_PHONE_LENGTH, transform: sanitizeDigits })}
        {text("holderEmail", "Email-ID", Mail, { required: true, maxLength: 100 })}
      </div>

      <SectionTitle>Bank</SectionTitle>
      <div className={`mt-3 ${GRID}`}>
        {text("bankName", "Bank Name", Landmark, { required: true, maxLength: MAX_BANK_NAME_LENGTH })}
        {text("branchName", "Bank Branch Name", Building2, { required: true, maxLength: MAX_BRANCH_NAME_LENGTH })}
        {text("branchAddress", "Bank Branch Address", MapPin, { required: true, maxLength: MAX_ADDRESS_LENGTH })}
        <FloatingLabelSelect
          icon={MapPin}
          label={<Req label="Country" required />}
          value={fields.bankCountryId}
          onValueChange={setCountry("bank")}
          options={countries.data || []}
          error={errors.bankCountryId}
          searchable
        />
        <FloatingLabelSelect
          icon={Map}
          label={<Req label="Province / State" required />}
          value={fields.bankStateId}
          onValueChange={setState("bank")}
          options={bankStates.data || []}
          error={errors.bankStateId}
          searchable
        />
        <FloatingLabelSelect
          icon={Building2}
          label={<Req label="City" required />}
          value={fields.bankCityId}
          onValueChange={set("bankCityId")}
          options={bankCities.data || []}
          error={errors.bankCityId}
          searchable
        />
        {text("bankPostal", "Postal Code", Hash, { required: true, maxLength: MAX_POSTAL_LENGTH })}
      </div>

      <div className={`mt-3.5 ${GRID}`}>
        {text("swiftCode", "Bank Swift Code (If Applicable)", Hash, { maxLength: MAX_CODE_LENGTH, transform: sanitizeAlphanumeric })}
        {text("ifscCode", "Bank IFSC Code (If Applicable)", Hash, { maxLength: MAX_CODE_LENGTH, transform: sanitizeAlphanumeric })}
        {text("routeNumber", "IBAN/Routing Number (If Applicable)", Hash, { maxLength: MAX_CODE_LENGTH, transform: sanitizeAlphanumeric })}
        <div className="lg:col-span-3">{text("otherDetails", "Other Details", FileText, { maxLength: MAX_OTHER_DETAILS_LENGTH })}</div>
      </div>

      <MobileActionBar context={null} className="md:mt-6">
        <Button type="button" onClick={handleSubmit} disabled={submitting} className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {submitting ? "Please wait…" : "Submit"}
        </Button>
      </MobileActionBar>
    </div>
  );
}
