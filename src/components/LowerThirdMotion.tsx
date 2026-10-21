"use client";

import { animate, motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

const DURATION_SEC = 1.5;
const HIDE_TIMES = [0, 0.9 / 1.5, 1];
const SHOW_TIMES = [0, 0.6 / 1.5, 1];

/** Two-step left-to-center clip wipe: 0.9s to halfway, 0.6s to finish. */
export function LowerThirdMotion({
  hidden,
  children,
}: {
  hidden: boolean;
  children: ReactNode;
}) {
  const readyRef = useRef(false);
  const insetLeft = useMotionValue(hidden ? 100 : 0);
  const clipPath = useMotionTemplate`inset(0% 0% 0% ${insetLeft}%)`;

  useEffect(() => {
    if (!readyRef.current) {
      insetLeft.set(hidden ? 100 : 0);
      readyRef.current = true;
      return;
    }
    const controls = hidden
      ? animate(insetLeft, [insetLeft.get(), 50, 100], {
          duration: DURATION_SEC,
          times: HIDE_TIMES,
          ease: "linear",
        })
      : animate(insetLeft, [insetLeft.get(), 50, 0], {
          duration: DURATION_SEC,
          times: SHOW_TIMES,
          ease: "linear",
        });
    return () => controls.stop();
  }, [hidden, insetLeft]);

  return (
    <motion.div
      className={`w-full ${hidden ? "pointer-events-none" : ""}`}
      style={{ clipPath }}
    >
      {children}
    </motion.div>
  );
}
