"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Change profile photo (mockup camera button on the avatar; the existing page crops with cropper.js). A small crop
 * without a library: the picture fills a round 260 px frame, the child drags it and zooms with the slider or the
 * +/- buttons (arrow keys move it), and Save draws the framed square into a 512 x 512 JPEG blob for onSave(blob).
 */

const FRAME = 260;
const OUT = 512;

export function K5PhotoDialog({ file, onCancel, onSave, saving }) {
  // { el: HTMLImageElement, url } once the chosen file has loaded. The page mounts a new dialog per file (key).
  const [loaded, setLoaded] = useState(null);
  const img = loaded?.el ?? null;
  const src = loaded?.url ?? null;
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const saveRef = useRef(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setLoaded({ el: image, url });
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return undefined;
    saveRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, saving, onCancel]);

  if (!file) return null;

  // Cover the frame at zoom 1; keep the picture covering the frame when moved.
  const base = img ? FRAME / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : FRAME;
  const h = img ? img.naturalHeight * scale : FRAME;
  const clamp = (p, z = zoom) => {
    const s = base * z;
    const maxX = img ? Math.max(0, (img.naturalWidth * s - FRAME) / 2) : 0;
    const maxY = img ? Math.max(0, (img.naturalHeight * s - FRAME) / 2) : 0;
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  };
  const setZoomClamped = (z) => {
    const next = Math.min(3, Math.max(1, z));
    setZoom(next);
    setPos((p) => clamp(p, next));
  };

  const save = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, OUT, OUT);
    const left = FRAME / 2 + pos.x - w / 2;
    const top = FRAME / 2 + pos.y - h / 2;
    const sx = -left / scale;
    const sy = -top / scale;
    const size = FRAME / scale;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, OUT, OUT);
    canvas.toBlob((blob) => blob && onSave(blob), "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,16,34,0.45)] p-4" onClick={() => !saving && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="k5-photo-h"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[26px] border-[3px] border-k5-ink bg-k5-card p-6 shadow-[0_6px_0_var(--k5-ink)]"
      >
        <h2 id="k5-photo-h" className="m-0 self-start font-k5-display text-2xl font-semibold">
          Change profile photo
        </h2>
        <p className="m-0 self-start text-[15px] font-extrabold text-k5-mut">Drag the picture to move it. Use the slider to zoom.</p>
        <div
          tabIndex={0}
          role="img"
          aria-label="Photo preview. Use the arrow keys to move it."
          onKeyDown={(e) => {
            const step = 10;
            const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
            const m = moves[e.key];
            if (m) {
              e.preventDefault();
              setPos((p) => clamp({ x: p.x + m[0], y: p.y + m[1] }));
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, start: pos };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = drag.current;
            setPos(clamp({ x: d.start.x + e.clientX - d.x, y: d.start.y + e.clientY - d.y }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          className="relative cursor-grab touch-none overflow-hidden rounded-full bg-k5-soft outline-none ring-k5-ac focus-visible:ring-4 active:cursor-grabbing"
          style={{ width: FRAME, height: FRAME, boxShadow: "0 0 0 4px var(--k5-card), 0 0 0 7px var(--k5-yB)" }}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ width: w, height: h, left: FRAME / 2 + pos.x - w / 2, top: FRAME / 2 + pos.y - h / 2 }}
            />
          )}
        </div>
        <div className="flex w-full items-center gap-3">
          <button type="button" onClick={() => setZoomClamped(zoom - 0.2)} aria-label="Zoom out" className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-ink">
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            aria-label="Zoom"
            className="min-w-0 flex-1 cursor-pointer accent-[var(--k5-ac)]"
          />
          <button type="button" onClick={() => setZoomClamped(zoom + 0.2)} aria-label="Zoom in" className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-ink">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2.5">
          <button type="button" onClick={onCancel} disabled={saving} className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-[17px] font-semibold text-k5-ink disabled:opacity-50">
            Cancel
          </button>
          <button
            ref={saveRef}
            type="button"
            onClick={save}
            disabled={!img || saving}
            className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
