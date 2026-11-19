"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BLINDS, EASE_IN_OUT } from "@/components/motion/motionConfig";
import { useMotion } from "@/components/motion/MotionProvider";

const CLOSE_S = 0.14;
const OPEN_S = 0.16;
const STAGGER_S = 0.01;
// Real-time guard: the strips take ~0.2 s, so if a phase has not finished after this long (a busy or background tab throttles
// animation frames) it is finished by force and the overlay can never stay on screen.
const GUARD_MS = 800;

/**
 * Curtains: Blinds. A row of vertical strips that sweep shut (close) and sweep open again (open) over the page.
 * The overlay NEVER takes clicks or focus (pointer-events-none, aria-hidden), it only covers the screen for a moment,
 * and it is not mounted at all while idle. It is cosmetic: the caller starts navigation itself and does not wait for it.
 *
 * Imperative API through `ref`:
 *   ref.current.close() -> Promise, resolves when the strips are shut (immediately under Reduced Motion)
 *   ref.current.open()  -> Promise, resolves when the strips have opened and the overlay is gone
 * Calling close() while opening (rapid navigation) simply reverses the strips; open() while idle does nothing.
 */
export function BlindsTransition({ ref }) {
  const { reduced } = useMotion();
  const [phase, setPhase] = useState("idle"); // idle | closing | closed | opening
  const phaseRef = useRef("idle");
  const waiters = useRef([]);
  const count = BLINDS.strips;

  const move = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const settle = () => {
    const done = waiters.current;
    waiters.current = [];
    done.forEach((resolve) => resolve());
  };
  const wait = () => new Promise((resolve) => waiters.current.push(resolve));

  useImperativeHandle(ref, () => ({
    close() {
      if (reduced) return Promise.resolve();
      if (phaseRef.current === "closed") return Promise.resolve();
      settle(); // an earlier open() that is cut short is treated as done
      move("closing");
      return wait();
    },
    open() {
      if (reduced || phaseRef.current === "idle") return Promise.resolve();
      settle();
      move("opening");
      return wait();
    },
  }));

  const onLastStripDone = () => {
    if (phaseRef.current === "closing") {
      move("closed");
      settle();
    } else if (phaseRef.current === "opening") {
      move("idle");
      settle();
    }
  };

  useEffect(() => {
    if (phase !== "closing" && phase !== "opening") return undefined;
    const timer = setTimeout(() => {
      if (phaseRef.current !== phase) return;
      phaseRef.current = phase === "closing" ? "closed" : "idle";
      setPhase(phaseRef.current);
      const done = waiters.current;
      waiters.current = [];
      done.forEach((resolve) => resolve());
    }, GUARD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "idle") return null;
  const shut = phase === "closing" || phase === "closed";
  // The strip that starts last (and so ends last): the right-most when closing, the left-most when opening.
  const lastStrip = shut ? count - 1 : 0;
  return (
    <div aria-hidden="true" data-blinds={phase} className="pointer-events-none fixed inset-0 z-[60] flex">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className={`block h-full flex-1 ${shut ? "origin-left" : "origin-right"} ${i % 2 === 0 ? "bg-k5-ac" : "bg-k5-acd"}`}
          initial={{ scaleX: shut ? 0 : 1 }}
          animate={{ scaleX: shut ? 1 : 0 }}
          transition={{ duration: shut ? CLOSE_S : OPEN_S, ease: EASE_IN_OUT, delay: (shut ? i : count - 1 - i) * STAGGER_S }}
          onAnimationComplete={i === lastStrip ? onLastStripDone : undefined}
        />
      ))}
    </div>
  );
}
