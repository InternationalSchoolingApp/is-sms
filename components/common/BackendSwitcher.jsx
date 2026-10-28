"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Server } from "lucide-react";
import {
  getClientBackendOverride,
  isBackendOverrideAllowed,
  setClientBackendOverride,
} from "@/utils/backendOrigin";
import { UAT_BACKEND_URLS as PRESET_URLS } from "@/constant/UatBackendUrls";

const CUSTOM_VALUE = "__custom__";
// Remembers where the tester dragged the toggle to, as FRACTIONS of the
// viewport (0..1), not raw px — so the same spot still makes sense after
// resizing the window or opening on a phone instead of a desktop, where raw
// px from one screen size can land off-screen entirely on another.
const POSITION_STORAGE_KEY = "uat_backend_switcher_position";
// Past this distance (px) a pointerup is treated as a drag, not a click —
// otherwise opening the picker would also nudge its position by a pixel or two.
const DRAG_THRESHOLD = 4;
const EDGE_MARGIN = 8;

function readStoredFraction() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || "null");
    if (
      saved &&
      typeof saved.xPct === "number" &&
      typeof saved.yPct === "number" &&
      saved.xPct >= 0 &&
      saved.xPct <= 1 &&
      saved.yPct >= 0 &&
      saved.yPct <= 1
    ) {
      return saved;
    }
  } catch {
    // ignore malformed/unavailable storage
  }
  return null;
}

/** Clamps a top-left px position so the box (of the given size) stays fully on screen. */
function clampToViewport(x, y, width, height) {
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(x, EDGE_MARGIN), maxX),
    y: Math.min(Math.max(y, EDGE_MARGIN), maxY),
  };
}

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
  // Fractions (0..1) of the viewport, or null = not dragged yet, so it
  // renders at the default bottom-right corner via CSS.
  const [posPct, setPosPct] = useState(null);
  const containerRef = useRef(null);
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  useLayoutEffect(() => {
    if (!allowed) return;
    const override = getClientBackendOverride();
    setCurrent(override);
    if (override && PRESET_URLS.includes(override)) {
      setSelectedOption(override);
    } else {
      setSelectedOption(CUSTOM_VALUE);
      setCustomValue(override);
    }
    setPosPct(readStoredFraction());
  }, [allowed]);

  // Keeps the box fully on screen: re-clamps whenever it's dragged, whenever
  // the panel opens/closes (its footprint changes from a small pill to a
  // ~320px panel), and whenever the window is resized or rotated. Runs
  // before paint so a correction never flashes at the wrong spot first.
  useLayoutEffect(() => {
    if (!posPct || !containerRef.current) return;

    function reclamp() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const desiredX = posPct.xPct * window.innerWidth;
      const desiredY = posPct.yPct * window.innerHeight;
      const clamped = clampToViewport(desiredX, desiredY, rect.width, rect.height);
      const nextPct = { xPct: clamped.x / window.innerWidth, yPct: clamped.y / window.innerHeight };
      if (Math.abs(nextPct.xPct - posPct.xPct) > 0.0005 || Math.abs(nextPct.yPct - posPct.yPct) > 0.0005) {
        setPosPct(nextPct);
        try {
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(nextPct));
        } catch {
          // best-effort persistence only
        }
      }
    }

    reclamp();
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [posPct, open]);

  function handlePointerDown(e) {
    // Read the actual rendered position (works whether we're still anchored
    // by the default bottom-right CSS or already using explicit left/top).
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag.dragging) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
    if (!drag.moved) return;
    const clamped = clampToViewport(drag.originX + dx, drag.originY + dy, drag.width, drag.height);
    const nextPct = { xPct: clamped.x / window.innerWidth, yPct: clamped.y / window.innerHeight };
    drag.lastPct = nextPct;
    setPosPct(nextPct);
  }

  function handlePointerUp(e) {
    const drag = dragRef.current;
    dragRef.current.dragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag.moved && drag.lastPct) {
      try {
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(drag.lastPct));
      } catch {
        // best-effort persistence only
      }
    }
  }

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

  const style = posPct ? { left: posPct.xPct * window.innerWidth, top: posPct.yPct * window.innerHeight } : undefined;

  return (
    <div
      ref={containerRef}
      className={`fixed z-[70] font-sans text-sm ${posPct ? "" : "bottom-4 right-4"}`}
      style={style}
    >
      {open ? (
        <div className="w-80 max-w-[calc(100vw-16px)] rounded-lg border border-amber-300 bg-white p-3 shadow-lg">
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
          onClick={() => {
            if (!dragRef.current.moved) setOpen(true);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex cursor-grab items-center gap-1 touch-none rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700 shadow-md hover:bg-amber-100 active:cursor-grabbing"
          title="Pick a UAT backend (drag to move)"
        >
          <Server size={14} />
          UAT
        </button>
      )}
    </div>
  );
}
