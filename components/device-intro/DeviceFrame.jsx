"use client";

import { motion } from "framer-motion";

/*
 * The physical part of the device around the live dashboard screen: bezel, camera, and for the laptop its base and hinge.
 * Pure CSS shapes (no model files), drawn behind the screen. It is positioned around the screen box with negative offsets,
 * so the screen itself (the real dashboard) is never moved or copied. `visible` fades it out when the screen expands.
 * Dynamic sizes come from the viewport (deviceConfig.geometry), so they are style values, not Tailwind classes.
 */
export function DeviceFrame({ geo, vw, vh, visible }) {
  const { bezel, outer, base, device } = geo;
  const fade = { duration: visible ? 0.5 : 0.45, ease: "easeOut" };
  const metal = "bg-[linear-gradient(145deg,#2B3140_0%,#12151D_55%,#222836_100%)]";
  return (
    <>
      {/* the bezel / body */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={fade}
        className={`absolute ${metal} shadow-[0_30px_80px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(255,255,255,0.08)]`}
        style={{ top: -bezel.top, left: -bezel.side, right: -bezel.side, bottom: -bezel.bottom, borderRadius: outer }}
      >
        {device === "laptop" && (
          // camera in the top bezel, and a small label in the bottom one
          <>
            <span className="absolute left-1/2 block -translate-x-1/2 rounded-full bg-[#05070B] ring-1 ring-white/10" style={{ top: bezel.top * 0.35, width: bezel.top * 0.3, height: bezel.top * 0.3 }} />
            <span className="absolute left-1/2 block -translate-x-1/2 rounded-full bg-white/10" style={{ bottom: bezel.bottom * 0.3, width: vw * 0.04, height: Math.max(2, vw * 0.003) }} />
          </>
        )}
        {device === "tablet" && <span className="absolute top-1/2 block -translate-y-1/2 rounded-full bg-[#05070B] ring-1 ring-white/10" style={{ left: bezel.side * 0.35, width: bezel.side * 0.3, height: bezel.side * 0.3 }} />}
        {device === "phone" && (
          <>
            <span className="absolute left-1/2 block -translate-x-1/2 rounded-full bg-[#05070B]" style={{ top: bezel.top * 0.3, width: vw * 0.22, height: bezel.top * 0.4 }} />
            {/* side buttons */}
            <span className="absolute block rounded-sm bg-[#1B202B]" style={{ right: -vw * 0.012, top: vh * 0.2, width: vw * 0.012, height: vh * 0.08 }} />
            <span className="absolute block rounded-sm bg-[#1B202B]" style={{ left: -vw * 0.012, top: vh * 0.16, width: vw * 0.012, height: vh * 0.05 }} />
            <span className="absolute block rounded-sm bg-[#1B202B]" style={{ left: -vw * 0.012, top: vh * 0.23, width: vw * 0.012, height: vh * 0.05 }} />
          </>
        )}
      </motion.div>

      {/* laptop base and hinge */}
      {device === "laptop" && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={fade}
          className="absolute"
          style={{ left: -vw * 0.07, width: vw * 1.14, top: vh + bezel.bottom - 1, height: base }}
        >
          <span
            className="absolute inset-0 block bg-[linear-gradient(180deg,#C9CFDA_0%,#8E96A6_55%,#6B7282_100%)] shadow-[0_40px_60px_rgba(0,0,0,0.5)]"
            style={{ clipPath: "polygon(2.5% 0, 97.5% 0, 100% 100%, 0 100%)", borderRadius: `0 0 ${Math.round(vw * 0.012)}px ${Math.round(vw * 0.012)}px` }}
          />
          <span className="absolute left-1/2 top-0 block -translate-x-1/2 rounded-b-xl bg-[#6B7282]" style={{ width: vw * 0.14, height: base * 0.4 }} />
        </motion.div>
      )}
    </>
  );
}
