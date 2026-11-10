"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_POLICY, sanitizeAppearance } from "@/constant/appearance";
import { getUserShortProfile, saveUserTheme } from "@/services/dashboardApi";

/**
 * Generic appearance provider (plan section 12, Step A): school policy + the user's saved
 * look -> the effective look, exposed as data-* attributes for the band's wrapper.
 * Storage: localStorage "is-{scope}-look:{userId}" — user-scoped so a shared device never
 * mixes students (APP-014); only allowlisted values are read back (APP-016); other tabs
 * follow through the storage event (APP-020). Server-side storage is Phase 4 (Step B).
 * Shipped for the K–5 student only (decision 07); other bands / roles can mount it later.
 */
const AppearanceContext = createContext(null);
const CHANGE_EVENT = "is-appearance-change";

function subscribeStorage(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
function readStorage(key) {
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseSaved(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function subscribeMedia(query) {
  return (callback) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };
}
const DARK_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeDark = subscribeMedia(DARK_QUERY);
const subscribeReduced = subscribeMedia(REDUCED_QUERY);

export function AppearanceProvider({ scope = "k5", userId, schoolUUID, policy = DEFAULT_POLICY, children }) {
  const key = userId ? `is-${scope}-look:${userId}` : null;
  const raw = useSyncExternalStore(subscribeStorage, () => readStorage(key), () => null);
  const systemDark = useSyncExternalStore(subscribeDark, () => window.matchMedia(DARK_QUERY).matches, () => false);
  const systemReduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
  // A look that could not be saved still previews (and can be retried) — never a fake "Saved".
  const [unsaved, setUnsaved] = useState(null);
  const [status, setStatus] = useState({ isSaving: false, error: null, savedAt: null });

  // Server sync: load appearance from USER_THEME on mount, save back on change.
  // serverReady = true immediately when localStorage has data (no flash); false = must wait for server.
  const [serverReady, setServerReady] = useState(() => Boolean(readStorage(key)));
  const serverLoaded = useRef(false);
  useEffect(() => {
    if (!userId || !schoolUUID || serverLoaded.current) return;
    serverLoaded.current = true;
    getUserShortProfile({ schoolUUID, userId }).then((profile) => {
      if (!profile?.userThemeColorCode) { setServerReady(true); return; }
      try {
        const colorObj = typeof profile.userThemeColorCode === "string"
          ? JSON.parse(profile.userThemeColorCode) : profile.userThemeColorCode;
        const appearance = colorObj?.appearance;
        if (appearance && typeof appearance === "object" && key) {
          window.localStorage.setItem(key, JSON.stringify(appearance));
          window.dispatchEvent(new Event(CHANGE_EVENT));
        }
      } catch { /* ignore malformed */ }
      setServerReady(true);
    }).catch(() => setServerReady(true));
  }, [userId, schoolUUID, key]);

  const allow = policy.allowUserCustomization !== false;
  const defaults = useMemo(() => sanitizeAppearance(policy.defaults), [policy.defaults]);
  const preferences = useMemo(() => {
    if (!allow) return defaults;
    return sanitizeAppearance({ ...defaults, ...(unsaved || parseSaved(raw) || {}) }, defaults);
  }, [allow, defaults, unsaved, raw]);

  const save = useCallback(
    (next) => {
      setStatus((s) => ({ ...s, isSaving: true }));
      try {
        if (next) window.localStorage.setItem(key, JSON.stringify(next));
        else window.localStorage.removeItem(key);
        window.dispatchEvent(new Event(CHANGE_EVENT));
        setUnsaved(null);
        setStatus({ isSaving: false, error: null, savedAt: Date.now() });
      } catch {
        setUnsaved(next);
        setStatus({ isSaving: false, error: "Couldn't save your look on this device.", savedAt: null });
      }
      // Background server save — fire-and-forget, localStorage is the instant preview.
      if (schoolUUID && userId) {
        saveUserTheme({ schoolUUID, userId, appearance: next }).catch(() => {});
      }
    },
    [key, schoolUUID, userId],
  );

  const value = useMemo(() => {
    const dark = preferences.mode === "dark" || (preferences.mode === "system" && systemDark);
    const reduced = preferences.motion === "reduced" || systemReduced;
    return {
      preferences,
      canCustomize: allow && Boolean(key),
      isLoading: !serverReady,
      isSaving: status.isSaving,
      error: status.error,
      savedAt: status.savedAt,
      isDark: dark,
      updatePreference: (name, next) => {
        if (!allow || !key) return;
        save(sanitizeAppearance({ ...preferences, [name]: next }, defaults));
      },
      // Several settings in one save (dyslexia mode flips font, spacing, colour and plain text together).
      updatePreferences: (patch) => {
        if (!allow || !key) return;
        save(sanitizeAppearance({ ...preferences, ...patch }, defaults));
      },
      resetPreferences: () => key && save(null),
      retry: () => unsaved && save(unsaved),
      // Spread on the band wrapper (and on anything portalled out of it).
      themeProps: {
        className: dark ? "dark" : "",
        "data-k5-theme": preferences.theme,
        "data-text-size": preferences.textSize,
        "data-k5-cvd": preferences.colorVision === "cvd" ? "true" : undefined,
        "data-contrast": preferences.contrast,
        "data-reading": preferences.reading,
        "data-tint": preferences.pageColor !== "none" ? preferences.pageColor : undefined,
        "data-plain": preferences.plainText === "on" ? "true" : undefined,
        "data-font": preferences.font,
        "data-hand": preferences.hand,
        "data-motion": reduced ? "reduced" : "full",
      },
    };
  }, [preferences, allow, key, status, systemDark, systemReduced, save, defaults, unsaved, serverReady]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/** preferences, isLoading, isSaving, error, updatePreference, resetPreferences (+ themeProps). */
export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within an AppearanceProvider");
  return value;
}
