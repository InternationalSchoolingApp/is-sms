/**
 * Pure helpers of the parent My Profile page (legacy adminProfileContent.js / adminProfile.js saveProfileDetails).
 * No React and no server code, so they can be checked with a plain node script.
 */
import { FALLBACK_TIMEZONE, isValidTimeZone } from "@/utils/attendanceDates";
import { PROFILE_LANGUAGES } from "@/components/parent/profile/profileLanguages";

/** The four gender values the backend's Gender enum accepts (legacy select). */
export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "TRANSGENDER", label: "Transgender" },
  { value: "DONOTWANTTOSPECIFY", label: "Do not want to specify" },
];

export const NAME_MAX = 100;

const text = (value) => (value == null ? "" : String(value).trim());

/** The IANA zone without the "posix/" / "right/" prefix of old DB values (legacy formatProfileTimezoneLabel). */
export function stripZonePrefix(raw) {
  return text(raw).replace(/^(posix|right)\//, "");
}

/** True when the saved timezone is a valid IANA zone (posix/ right/ prefixes allowed). */
export const hasConfiguredTimezone = (raw) => isValidTimeZone(text(raw)) || isValidTimeZone(stripZonePrefix(raw));

/**
 * The timezone to show / preselect: the configured one when it is a valid IANA zone (never overwritten), else
 * Asia/Singapore (project timezone rule). `posix/` prefixes are dropped for the check only when the zone is not
 * valid as written.
 */
export function resolveProfileTimezone(raw) {
  const value = text(raw);
  if (isValidTimeZone(value)) return value;
  const stripped = stripZonePrefix(value);
  return isValidTimeZone(stripped) ? stripped : FALLBACK_TIMEZONE;
}

/** Label of one TIMEZONE-LIST row, as legacy getAllCountryTimezone: "(extra) - extra1/extra3". */
export function timezoneLabel(item) {
  return `(${item.extra ?? ""}) - ${item.extra1 ?? ""}/${item.extra3 ?? ""}`;
}

/**
 * The option (key) to preselect for the saved timezone: a configured valid zone is matched by name, then by the saved
 * timezone id (never replaced by another zone); a missing / invalid one preselects Asia/Singapore. Returns "" while
 * the list is empty or has no match.
 */
export function pickTimezoneKey(options, savedZone, savedId) {
  if (!Array.isArray(options) || !options.length) return "";
  const zone = text(savedZone);
  if (hasConfiguredTimezone(zone)) {
    const name = resolveProfileTimezone(zone);
    const match = options.find((o) => o.value === name) || options.find((o) => savedId != null && String(o.key) === String(savedId));
    return match ? match.key : "";
  }
  return options.find((o) => o.value === FALLBACK_TIMEZONE)?.key ?? "";
}

/** Names of a comma separated language code list (legacy getLanguagesValueByCode). "" when none. */
export function languageNames(codes) {
  const list = Array.isArray(codes) ? codes : text(codes).split(",").map((c) => c.trim()).filter(Boolean);
  return list
    .map((code) => PROFILE_LANGUAGES.find((l) => l.code === code)?.name)
    .filter(Boolean)
    .join(", ");
}

/** Only known language codes, in list order, no duplicates. */
export function knownLanguageCodes(codes) {
  const wanted = new Set(Array.isArray(codes) ? codes : text(codes).split(",").map((c) => c.trim()));
  return PROFILE_LANGUAGES.filter((l) => wanted.has(l.code)).map((l) => l.code);
}

/**
 * The national digits of a saved phone number. The backend may hold the number with its dial code ("+91 85339..."):
 * a leading "+" followed by the dial code is dropped (legacy editProfilePage normalised it the same way).
 */
export function nationalDigits(number, dialCode) {
  const raw = text(number);
  const digits = raw.replace(/\D/g, "");
  const dial = text(dialCode).replace(/\D/g, "");
  if (raw.startsWith("+") && dial && digits.startsWith(dial) && digits.length > dial.length) return digits.slice(dial.length);
  return digits;
}

/** The editable draft built from the loaded details. `zoneKey` is filled in once the timezone list is known. */
export function buildDraft(details) {
  const d = details || {};
  return {
    name: text(d.userFullName),
    gender: text(d.gender).toUpperCase(),
    phone: nationalDigits(d.contactNumber, d.dialCode),
    iso: text(d.countryCode).toLowerCase(),
    isd: text(d.dialCode),
    countryId: d.countryId ? String(d.countryId) : "",
    stateId: d.stateId ? String(d.stateId) : "",
    cityId: d.cityId ? String(d.cityId) : "",
    zoneKey: "",
    languages: knownLanguageCodes(d.languagesKnown),
  };
}

/**
 * Required-field checks of legacy saveProfileDetails (same messages), in the same order. Returns { field: message }.
 * The phone is optional and checked separately (utils/profilePhone.js). Email is read-only, so it is not checked.
 */
export function validateProfile(draft) {
  const errors = {};
  const name = text(draft.name);
  if (!name) errors.name = "User name is required";
  else if (name.length > NAME_MAX) errors.name = `User name can be at most ${NAME_MAX} characters.`;
  if (!GENDER_OPTIONS.some((g) => g.value === draft.gender)) errors.gender = "Gender is required";
  if (!draft.countryId) errors.country = "Country is required";
  if (!draft.stateId) errors.state = "State is required";
  if (!draft.cityId) errors.city = "City is required";
  return errors;
}

/** True when two drafts hold the same values (to tell "nothing changed" from a real edit). */
export function sameDraft(a, b) {
  return (
    ["name", "gender", "phone", "iso", "countryId", "stateId", "cityId", "zoneKey"].every((k) => text(a[k]) === text(b[k])) &&
    a.languages.join(",") === b.languages.join(",")
  );
}

/** Photo file rule of legacy cropImage for the profile image: JPG / PNG, up to 5 MB. Returns a message or null. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export function photoProblem(file) {
  if (!file) return "Please choose a file.";
  const ok = file.type === "image/jpeg" || file.type === "image/png";
  if (!ok || file.size > PHOTO_MAX_BYTES) return "Please upload files in JPG, PNG, and JPEG with max size of 5MB";
  return null;
}
