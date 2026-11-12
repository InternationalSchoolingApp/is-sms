"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";

/**
 * Crop for the profile photo (legacy adminProfile.js crops with cropper.js before save-docs). Without a library: the
 * picture fills a round frame, the parent drags it (arrow keys too) and zooms with the slider or the +/- buttons, and
 * Save draws the framed square into a 512 x 512 JPEG blob for onSave(blob). The file is read in the browser only
 * (object URL, revoked on close); it goes to /api/parent/profile-document when saved.
 */

const FRAME = 240;
const OUT = 512;

export function ParentPhotoDialog({ file, onCancel, onSave, saving }) {
  // { el: HTMLImageElement, url } once the chosen file has loaded. The page mounts a new dialog per file (key).
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(false);
  const img = loaded?.el ?? null;
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const saveRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => setLoaded({ el: image, url });
    image.onerror = () => setFailed(true);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    saveRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onCancel]);

  // The picture covers the frame at zoom 1 and keeps covering it when moved.
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
    ctx.drawImage(img, -left / scale, -top / scale, FRAME / scale, FRAME / scale, 0, 0, OUT, OUT);
    canvas.toBlob((blob) => blob && onSave(blob), "image/jpeg", 0.9);
  };

  const iconButton = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-black hover:bg-slate-50";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-photo-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-[380px] flex-col items-center gap-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 id="parent-photo-title" className="self-start text-lg font-bold text-black">
          Change profile photo
        </h2>
        <p className="self-start text-sm text-black/60">{failed ? "This picture could not be read. Please choose another file." : "Drag the picture to move it. Use the slider to zoom."}</p>
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
          className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-full bg-slate-100 outline-none ring-primary focus-visible:ring-4 active:cursor-grabbing"
          style={{ width: FRAME, height: FRAME }}
        >
          {loaded && (
            <Image
              src={loaded.url}
              alt=""
              width={Math.round(w)}
              height={Math.round(h)}
              unoptimized
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ width: w, height: h, left: FRAME / 2 + pos.x - w / 2, top: FRAME / 2 + pos.y - h / 2 }}
            />
          )}
        </div>
        <div className="flex w-full items-center gap-3">
          <button type="button" onClick={() => setZoomClamped(zoom - 0.2)} aria-label="Zoom out" className={iconButton}>
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoomClamped(Number(e.target.value))} aria-label="Zoom" className="min-w-0 flex-1 cursor-pointer accent-primary" />
          <button type="button" onClick={() => setZoomClamped(zoom + 0.2)} aria-label="Zoom in" className={iconButton}>
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-black disabled:opacity-50">
            Cancel
          </button>
          <button ref={saveRef} type="button" onClick={save} disabled={!img || saving} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
            {saving ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
