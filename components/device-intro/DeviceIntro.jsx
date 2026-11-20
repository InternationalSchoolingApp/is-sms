"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useIsFetching } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { deviceFor, geometry } from "@/components/device-intro/deviceConfig";
import { DeviceFrame } from "@/components/device-intro/DeviceFrame";
import { introSeen, markIntroSeen } from "@/utils/introMemory";

/*
 * The login intro. After a student signs in, the REAL dashboard (the one and only copy: DashboardBody and everything under it
 * is rendered once, here, as `children`) is shown inside a 3D device - a laptop on a laptop-sized screen, a tablet on a
 * tablet, a phone on a phone - tilted and gently floating over a dark blue backdrop. What is on its screen is whatever the
 * dashboard shows at that moment: first its loading skeleton, then each section replacing its own skeleton as its data
 * arrives. When the dashboard is really ready the device turns to face the student and its screen grows to fill the viewport
 * while the frame and backdrop fade away, so the student "walks into" the screen.
 *
 * How it stays one dashboard: the children never move in the React tree. Only the classes of the wrappers around them change
 * (`contents` = no box at all, normal page; `fixed inset-0` = the device's screen box). The screen is laid out at the full
 * viewport size and the device is scaled down, so it shows this viewport's own layout; at the end the scale is 1, the wrappers
 * go back to `contents`, and nothing mounts or unmounts, so there is no flicker, no second set of requests and no state lost.
 *
 * Ready = the session and grade are known, no dashboard request is in flight (React Query's useIsFetching), and no loading
 * skeleton (`aria-busy`) is left on the screen, for 3 checks in a row; never faster than MIN_HOLD_MS (so the device is seen)
 * and never later than MAX_WAIT_MS (a failed or slow request shows its own error / skeleton in the dashboard, not a stuck
 * animation). No fake progress and no timer standing in for loading. Plays once per login on the dashboard home, not with
 * reduced motion, and not without CSS 3D; Skip (button or Esc) ends it at once and the dashboard simply carries on loading.
 */
const MIN_HOLD_MS = 1600;
const MAX_WAIT_MS = 15000;
const POLL_MS = 200;
const EXPAND_S = 0.85;

const noSubscribe = () => () => {};
const subscribeResize = (callback) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};
const readSize = () => `${window.innerWidth}x${window.innerHeight}`;

function css3DSupported() {
  try {
    return Boolean(window.CSS?.supports?.("transform-style", "preserve-3d"));
  } catch {
    return false;
  }
}

// The OS setting, or the student's own Appearance "Motion: Reduced" (saved per user by AppearanceProvider).
function motionReduced(userId) {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    const look = JSON.parse(window.localStorage.getItem(`is-k5-look:${userId}`) || "null");
    return look?.motion === "reduced";
  } catch {
    return false;
  }
}

export function DeviceIntro({ children }) {
  const { context, ready, gradeResolved } = useDashboardContext();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const size = useSyncExternalStore(subscribeResize, readSize, () => "0x0");
  const [vw, vh] = size.split("x").map(Number);
  const [play, setPlay] = useState(null); // null = not decided yet
  const [phase, setPhase] = useState("enter"); // enter -> hold -> expand -> done
  const screenRef = useRef(null);
  const fetching = useIsFetching();
  const live = useRef({ ready: false, fetching: 0 });
  const isHome = /^\/[^/]+\/student\/?$/.test(pathname || "");

  // Decide once, in the browser, as soon as the account is known (a state update while rendering, before anything is painted).
  if (play === null && mounted && ready && context?.uniqueId) {
    setPlay(isHome && !introSeen(context.uniqueId) && !motionReduced(context.userId) && css3DSupported());
  }

  useEffect(() => {
    live.current = { ready: Boolean(ready && gradeResolved), fetching };
  }, [ready, gradeResolved, fetching]);

  // Sent away from the home (the onboarding gate sends a student on to the welcome / setup pages): nothing to show over
  // a different page, so it is simply over (and not counted as seen).
  const playing = play === true && phase !== "done" && isHome;
  const geo = geometry(deviceFor(vw), vw, vh);

  // enter -> hold is done by the animation's own completion; here: hold -> expand when the dashboard is really ready.
  useEffect(() => {
    if (!playing || phase !== "hold") return undefined;
    const started = Date.now();
    let okInARow = 0;
    const id = setInterval(() => {
      const waited = Date.now() - started;
      const busy = Boolean(screenRef.current?.querySelector('[aria-busy="true"]'));
      okInARow = live.current.ready && live.current.fetching === 0 && !busy ? okInARow + 1 : 0;
      if ((okInARow >= 3 && waited >= MIN_HOLD_MS) || waited >= MAX_WAIT_MS) {
        clearInterval(id);
        setPhase("expand");
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [playing, phase]);

  // Seen for this login once it has been watched through (or skipped), not when it is cut off by a redirect.
  useEffect(() => {
    if (play && (phase === "expand" || phase === "done") && context?.uniqueId) markIntroSeen(context.uniqueId);
  }, [play, phase, context?.uniqueId]);

  // Esc skips.
  useEffect(() => {
    if (!playing) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setPhase("done");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const expanding = phase === "expand";
  const deviceTarget =
    phase === "enter"
      ? { scale: geo.scale, rotateX: geo.tilt.x, rotateY: geo.tilt.y, y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
      : phase === "hold"
        ? {
            scale: geo.scale,
            rotateX: [geo.tilt.x, geo.tilt.x + 1.5, geo.tilt.x],
            rotateY: [geo.tilt.y, geo.tilt.y + 7, geo.tilt.y],
            y: [0, -vh * 0.012, 0],
            opacity: 1,
            transition: { duration: 6, ease: "easeInOut", repeat: Infinity },
          }
        : { scale: 1, rotateX: 0, rotateY: 0, y: 0, opacity: 1, transition: { duration: EXPAND_S, ease: [0.65, 0, 0.35, 1] } };
  const firstName = String(context?.userName || "").trim().split(" ")[0];

  return (
    <>
      <AnimatePresence>
        {playing && (
          <motion.div
            key="device-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: expanding ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: expanding ? 0.6 : 0.4, delay: expanding ? 0.25 : 0 }}
            className="fixed inset-0 z-[94] bg-[radial-gradient(circle_at_50%_42%,#123E86_0%,#0A1F44_55%,#050F24_100%)]"
          />
        )}
      </AnimatePresence>

      {/* wrapper > device > screen > the real dashboard: the same elements before, during and after, only their classes change */}
      <div className={playing ? "fixed inset-0 z-[95]" : "contents"} style={playing ? { perspective: 2400 } : undefined}>
        <motion.div
          initial={false}
          animate={playing ? deviceTarget : { scale: 1, rotateX: 0, rotateY: 0, y: 0, opacity: 1 }}
          onAnimationComplete={() => {
            if (phase === "enter") setPhase("hold");
            else if (phase === "expand") setPhase("done");
          }}
          className={playing ? "absolute inset-0 will-change-transform" : "contents"}
          style={playing ? { transformStyle: "preserve-3d" } : undefined}
        >
          {playing && <DeviceFrame geo={geo} vw={vw} vh={vh} visible={!expanding} />}
          <motion.div
            ref={screenRef}
            initial={false}
            animate={playing ? { borderRadius: expanding ? 0 : geo.radius } : { borderRadius: 0 }}
            transition={{ duration: expanding ? EXPAND_S : 0.3, ease: "easeInOut" }}
            inert={playing ? true : undefined}
            className={playing ? "absolute inset-0 overflow-hidden bg-white shadow-[0_0_90px_rgba(77,163,255,0.4)]" : "contents"}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>

      {playing && (
        <>
          <p
            role="status"
            aria-live="polite"
            className={`pointer-events-none fixed inset-x-0 bottom-[7vh] z-[96] m-0 px-4 text-center text-[1.0625rem] font-semibold text-white/90 transition-opacity duration-300 ${expanding ? "opacity-0" : "opacity-100"}`}
          >
            {phase === "enter" ? "Opening your learning device…" : firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
          </p>
          <button
            type="button"
            onClick={() => setPhase("done")}
            className="fixed bottom-6 right-6 z-[96] cursor-pointer rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            Skip
          </button>
        </>
      )}
    </>
  );
}
