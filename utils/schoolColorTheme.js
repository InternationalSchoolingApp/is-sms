/**
 * Parses SchoolSettingsTechnical.parentColor (see utils/schoolSettings.js's
 * getSchoolSettingsTechnical) into the `rootcss` block the legacy JSP injects
 * as a <style> tag. `parentColor` is a JSON *string* column, e.g.
 * '{"rootcss":":root{--pc:#...;}","HEADER_BG":"#fff","SIDEBAR_NEVIGATION_BG":"#fff"}'
 * — a malformed/empty value is expected for schools with no theme configured
 * yet, so this returns "" instead of throwing.
 */
export function extractRootCss(parentColor) {
  if (!parentColor) return "";
  try {
    const parsed = JSON.parse(parentColor);
    return typeof parsed?.rootcss === "string" ? parsed.rootcss : "";
  } catch {
    return "";
  }
}
