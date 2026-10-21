// The original, default-branded tenant — its own static assets (Fav_Icon.png,
// loader-new.gif, IS_Final_Logo.webp) carry International Schooling's own
// mark baked in, so they're only correct for this slug; every other school
// must use its own dynamic logo/favicon instead of these static fallbacks.
export const DEFAULT_SCHOOL_UUID = "international-schooling";

export const SCHOOL_URLS = [
    {
        "schoolUUID" : "international-schooling",
        "url" : "https://internationalschooling.org"
    },
    {
        "schoolUUID" : "anchored-education",
        "url" : "https://anchoreded.com/"
    },

]

// Static fallback for the school's public website link, used before the
// backend's own schoolSettingsLinks.schoolWebsite has resolved (or if a
// school has none configured). Defaults to International Schooling's site,
// matching the previous hardcoded behavior.
export function getSchoolWebsiteUrl(schoolUUID) {
    const match = SCHOOL_URLS.find((item) => item.schoolUUID === schoolUUID);
    return match?.url || "https://internationalschooling.org/";
}