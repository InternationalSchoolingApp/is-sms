"use client";

import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Camera, Pencil, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { LanguageSelect, ParentPhoneField, ViewField } from "@/components/parent/profile/ProfileFormFields";
import { ParentPhotoDialog } from "@/components/parent/profile/ParentPhotoDialog";
import { GENDER_OPTIONS, NAME_MAX, buildDraft, hasConfiguredTimezone, languageNames, nationalDigits, photoProblem, pickTimezoneKey, resolveProfileTimezone, sameDraft, timezoneLabel, validateProfile } from "@/components/parent/profile/profileHelpers";
import { useParentProfile, useParentProfileMaster } from "@/hooks/parent/useParentProfile";
import { getSettingsByTypeAndKey } from "@/services/settingsApi";
import { callServer } from "@/utils/serverCall";
import { loadPhoneUtils, phoneProblem } from "@/utils/profilePhone";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

// The backend gives the photo as an absolute URL, or a path on its own host (the default avatar).
function photoSrc(raw) {
  const value = String(raw || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return `${resolveBackendOrigin()}${value}`;
  return "";
}

const GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Parent "My Profile" personal details (legacy adminProfileContent.js + adminProfile.js): the photo with Upload, the
 * details in view mode with an Edit button, and the edit form (user name, gender, phone with country code, country /
 * state / city, timezone, languages; e-mail, login name and added date are read-only) with Save / Cancel. Required
 * fields and messages are the legacy ones; the phone is optional and checked per country (utils/profilePhone.js, the
 * school setting PHONE_NUMBER_VALIDATION = "false" turns that off).
 */
export function ParentProfileDetails({ onWithdrawal }) {
  const profile = useParentProfile();
  const { details, schoolUUID, parentUserId } = profile;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const fileRef = useRef(null);

  const countries = useParentProfileMaster("countries", null, true);
  const timezones = useParentProfileMaster("timezones", null, true);
  const states = useParentProfileMaster("states", draft?.countryId, editing);
  const cities = useParentProfileMaster("cities", draft?.stateId, editing);

  const phoneSetting = useQuery({
    queryKey: ["parent-phone-validation", schoolUUID, parentUserId],
    queryFn: () => callServer(() => getSettingsByTypeAndKey("CONFIGURATION", "PHONE_NUMBER_VALIDATION")),
    enabled: editing && Boolean(schoolUUID && parentUserId),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const options = (list) => list.map((item) => ({ value: item.key, label: item.value }));
  const countryOptions = useMemo(() => options(countries.options), [countries.options]);
  const stateOptions = useMemo(() => options(states.options), [states.options]);
  const cityOptions = useMemo(() => options(cities.options), [cities.options]);
  const zoneOptions = useMemo(() => timezones.options.map((item) => ({ value: item.key, label: timezoneLabel(item) })), [timezones.options]);

  // The saved zone's option (or Asia/Singapore when none is configured), used until the parent picks another.
  const defaultZoneKey = useMemo(
    () => (details ? pickTimezoneKey(timezones.options, details.countryTimezone, details.countryTimezoneId) : ""),
    [details, timezones.options],
  );
  const zoneKey = draft?.zoneKey || defaultZoneKey;

  if (profile.isLoading) return <Card><p className="py-10 text-center text-sm text-black/50">Loading…</p></Card>;
  if (profile.sessionOut || profile.failed || !details) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-black/60">
          <p>{profile.sessionOut ? "Your session has expired. Please log in again." : profile.failedMessage || "Unable to load your profile."}</p>
          {!profile.sessionOut && (
            <button type="button" onClick={profile.retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Try again
            </button>
          )}
        </div>
      </Card>
    );
  }

  const startEdit = () => {
    setDraft(buildDraft(details));
    setErrors({});
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setErrors({});
  };
  const patch = (values) => setDraft((d) => ({ ...d, ...values }));
  const savedIso = String(details.countryCode || "").toLowerCase();

  const save = async () => {
    const found = validateProfile(draft);
    const utils = await loadPhoneUtils();
    const iso = draft.iso;
    const countryName = countries.options.find((c) => c.extra.toLowerCase() === iso)?.value;
    const problem = phoneProblem({ number: draft.phone, iso, required: false, utils, enabled: String(phoneSetting.data ?? "").trim().toLowerCase() !== "false", countryName });
    if (problem) found.phone = problem;
    const zone = timezones.options.find((z) => z.key === zoneKey);
    if (!zone) found.zone = "Timezone is required";
    setErrors(found);
    const first = Object.values(found)[0];
    if (first) {
      toast.error(first);
      return;
    }
    const result = await profile.save({
      userFullName: draft.name.trim(),
      gender: draft.gender,
      contactNumber: draft.phone,
      countryId: draft.countryId,
      stateId: draft.stateId,
      cityId: draft.cityId,
      countryTimezone: zone.value,
      countryTimezoneId: zone.key,
      isdCode: draft.isd,
      languageKnown: draft.languages,
    });
    if (result.ok) {
      toast.success("Profile Update Successfully");
      cancelEdit();
    } else {
      toast.error(result.message);
    }
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) toast.error(problem);
    else setPhotoFile(file);
  };
  const savePhoto = async (blob) => {
    const result = await profile.uploadPhoto(blob);
    if (result.ok) {
      toast.success(result.message);
      setPhotoFile(null);
    } else {
      toast.error(result.message);
    }
  };

  // A profile without a valid timezone can be saved as it is: that stores the Asia/Singapore fallback.
  const dirty = editing && draft && (!sameDraft({ ...draft, zoneKey }, { ...buildDraft(details), zoneKey: defaultZoneKey }) || !hasConfiguredTimezone(details.countryTimezone));
  const phoneView = details.contactNumber ? nationalDigits(details.contactNumber, details.dialCode) : "";

  return (
    <Card>
      <div className="flex flex-col items-center gap-1 pb-5 text-center">
        <div className="relative">
          <ChildAvatar child={{ studentName: details.userFullName, profilePic: photoSrc(details.profileImage) }} size={96} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={profile.uploading}
            aria-label="Upload profile image"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow hover:opacity-90 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={onPhoto} className="hidden" tabIndex={-1} />
        </div>
        <p className="mt-2 text-lg font-semibold text-primary">{details.userFullName || "N/A"}</p>
        <p className="text-xs text-black/50">Profile Image (JPG or PNG, max size 5MB)</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-bold text-black">Personal Details</h2>
        </div>
        {!editing && (
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
        )}
      </div>

      {editing && draft ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className={GRID}>
            <FloatingLabelInput label="User Name" value={draft.name} maxLength={NAME_MAX} error={errors.name} onChange={(e) => patch({ name: e.target.value })} autoComplete="name" />
            <FloatingLabelSelect label="Gender" value={draft.gender} options={GENDER_OPTIONS} error={errors.gender} onValueChange={(value) => patch({ gender: value })} />
            <ParentPhoneField
              initialDigits={draft.phone}
              initialIso={savedIso}
              error={errors.phone}
              onChange={({ phone, iso, isd }) =>
                // The saved dial code keeps its stored form until the country is changed (legacy onCountryChange).
                setDraft((d) => ({ ...d, phone, iso: iso || d.iso, isd: iso && iso !== savedIso ? isd : d.isd }))
              }
            />
            <FloatingLabelInput label="Email" value={details.emailId} disabled readOnly />
            <FloatingLabelInput label="User name (login)" value={details.userName} disabled readOnly />
            <FloatingLabelInput label="Added Date" value={details.addedDate} disabled readOnly />
            <FloatingLabelSelect
              label="Country"
              searchable
              value={draft.countryId}
              options={countryOptions}
              error={errors.country}
              onValueChange={(value) => patch({ countryId: value, stateId: "", cityId: "" })}
            />
            <FloatingLabelSelect
              label="State"
              searchable
              value={draft.stateId}
              options={stateOptions}
              disabled={!draft.countryId}
              error={errors.state}
              onValueChange={(value) => patch({ stateId: value, cityId: "" })}
            />
            <FloatingLabelSelect label="City" searchable value={draft.cityId} options={cityOptions} disabled={!draft.stateId} error={errors.city} onValueChange={(value) => patch({ cityId: value })} />
            <FloatingLabelSelect label="Timezone" searchable value={zoneKey} options={zoneOptions} error={errors.zone} onValueChange={(value) => patch({ zoneKey: value })} />
            <LanguageSelect value={draft.languages} onChange={(languages) => patch({ languages })} />
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={cancelEdit} disabled={profile.saving} className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={profile.saving || !dirty} className="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {profile.saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <div className={GRID}>
          <ViewField label="User Name" value={details.userFullName} />
          <ViewField label="Gender" value={GENDER_OPTIONS.find((g) => g.value === details.gender.toUpperCase())?.label || details.gender} />
          <ViewField label="Phone Number" value={phoneView && details.dialCode ? `+${details.dialCode.replace(/\D/g, "")} ${phoneView}` : phoneView} />
          <ViewField label="Email" value={details.emailId} />
          <ViewField label="User name (login)" value={details.userName} />
          <ViewField label="Added Date" value={details.addedDate} />
          <ViewField label="Country" value={details.country} />
          <ViewField label="State" value={details.state} />
          <ViewField label="City" value={details.city} />
          <ViewField label="Timezone" value={resolveProfileTimezone(details.countryTimezone)} />
          <ViewField label="Languages" value={languageNames(details.languagesKnown)} />
        </div>
      )}

      {!editing && (
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onWithdrawal} className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
            Withdrawal Request
          </button>
        </div>
      )}

      {photoFile && <ParentPhotoDialog key={photoFile.name + photoFile.size} file={photoFile} saving={profile.uploading} onCancel={() => setPhotoFile(null)} onSave={savePhoto} />}
    </Card>
  );
}

function Card({ children }) {
  return <div className="rounded-[10px] border border-slate-200 bg-white p-4 sm:p-6">{children}</div>;
}
