"use client";

import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import {
  getClientBackendOverride,
  isBackendOverrideAllowed,
  setClientBackendOverride,
} from "@/utils/backendOrigin";
import { UAT_BACKEND_URLS as PRESET_URLS } from "@/constant/UatBackendUrls";

const CUSTOM_VALUE = "__custom__";

/**
 * UAT-only floating picker that lets a tester point this deployment at any
 * backend origin (see utils/backendOrigin.js's override cookie doc comment
 * for why this has to be a cookie, not localStorage). Renders nothing unless
 * NEXT_PUBLIC_DEPLOYMENT_MODE is DEV or UAT — never rendered on production.
 * Mounted once in app/layout.js.
 */
export function BackendSwitcher() {
  const allowed = isBackendOverrideAllowed();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [customValue, setCustomValue] = useState("");
  // What the <select> itself shows — independent of `current` (the applied
  // override), so picking "Custom…" reveals the text input immediately
  // instead of snapping back to the preset `current` still resolves to.
  const [selectedOption, setSelectedOption] = useState(CUSTOM_VALUE);

  useEffect(() => {
    if (!allowed) return;
    const override = getClientBackendOverride();
    setCurrent(override);
    if (override && PRESET_URLS.includes(override)) {
      setSelectedOption(override);
    } else {
      setSelectedOption(CUSTOM_VALUE);
      setCustomValue(override);
    }
  }, [allowed]);

  if (!allowed) return null;

  function apply(url) {
    setClientBackendOverride(url);
    window.location.reload();
  }

  function handleSelectChange(e) {
    const value = e.target.value;
    setSelectedOption(value);
    if (value === CUSTOM_VALUE) {
      setCustomValue(current || "");
      return;
    }
    apply(value);
  }

  function handleReset() {
    setClientBackendOverride("");
    window.location.reload();
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70] font-sans text-sm">
      {open ? (
        <div className="w-80 rounded-lg border border-amber-300 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-amber-700">UAT backend</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <p className="mb-2 break-all text-xs text-gray-500">
            Currently: {current || "default backend"}
          </p>

          <select
            value={selectedOption}
            onChange={handleSelectChange}
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1"
          >
            {PRESET_URLS.map((url) => (
              <option key={url} value={url}>
                {url}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom…</option>
          </select>

          {selectedOption === CUSTOM_VALUE && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="http://164.52.x.x:port"
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
              <button
                type="button"
                onClick={() => customValue.trim() && apply(customValue)}
                className="shrink-0 rounded bg-amber-600 px-2 py-1 text-white hover:bg-amber-700"
              >
                Go
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            Reset to default
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700 shadow-md hover:bg-amber-100"
          title="Pick a UAT backend"
        >
          <Server size={14} />
          UAT
        </button>
      )}
    </div>
  );
}
