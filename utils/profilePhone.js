/**
 * Phone number rules of the existing profile page (masterContent.js validatePhoneNumber / isPhoneNumberValid /
 * getMaxValidPhoneDigitCount), with the libphonenumber build that ships with intl-tel-input (already a dependency):
 *   - empty: "Either field value is invalid or empty." when the field is mandatory, fine otherwise;
 *   - longer than the country's example mobile number (national significant number, trunk "0" dropped):
 *     "Phone number for {country} can be at most {n} digits.";
 *   - otherwise libphonenumber must accept it: "Please enter a valid phone number for {country}.";
 *   - the school setting CONFIGURATION / PHONE_NUMBER_VALIDATION = "false" turns the country check off.
 * The utils file (~260 KB) is loaded only when a profile editor needs it; until then only the empty check runs.
 */

let utilsPromise = null;

/** Loads intl-tel-input's utils once; resolves to the utils object, or null when it cannot be loaded. */
export function loadPhoneUtils() {
  if (!utilsPromise) {
    utilsPromise = import("intl-tel-input/utils")
      .then((mod) => {
        // The closure-compiled file is wrapped differently by each bundler: take whichever object has the functions.
        const candidates = [mod?.default, mod, mod?.default?.default, typeof window !== "undefined" ? window.intlTelInputUtils : null];
        return candidates.find((c) => c && typeof c.isValidNumber === "function" && typeof c.getExampleNumber === "function") || null;
      })
      .catch(() => null);
  }
  return utilsPromise;
}

function maxDigits(utils, iso) {
  try {
    let digits = String(utils.getExampleNumber(iso, "MOBILE", "NATIONAL") || "").replace(/\D/g, "");
    if (digits.length > 1 && digits[0] === "0") digits = digits.slice(1);
    return digits.length;
  } catch {
    return 0;
  }
}

/**
 * The problem with a phone number, or null when it may be saved.
 * { number (digits only), iso (ISO2, lower case), required, utils (loadPhoneUtils result or null),
 *   enabled (PHONE_NUMBER_VALIDATION is not "false"), countryName }.
 */
export function phoneProblem({ number, iso, required, utils, enabled = true, countryName }) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return required ? "Either field value is invalid or empty." : null;
  if (!iso) return "Please choose the country code.";
  if (!enabled) return null;
  const name = countryName || "the selected country";
  // Without libphonenumber (still loading / failed) keep a plain length check instead of accepting anything.
  if (!utils) {
    if (digits.length < 5 || digits.length > 15) return "Please enter a valid phone number for " + name + ".";
    return null;
  }
  const max = maxDigits(utils, iso);
  if (max > 0 && digits.length > max) return "Phone number for " + name + " can be at most " + max + " digits.";
  try {
    if (!utils.isValidNumber(digits, iso)) return "Please enter a valid phone number for " + name + ".";
  } catch {
    // A country libphonenumber does not know: fall back to the plain length check.
    if (digits.length < 5 || digits.length > 15) return "Please enter a valid phone number for " + name + ".";
    return null;
  }
  return null;
}
