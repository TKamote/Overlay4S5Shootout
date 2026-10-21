"use client";

import { useState, useEffect, type ReactNode } from "react";
import { STAGE_H, STAGE_W } from "@/lib/creatorVerticalSpacing";

/** Scale-to-fit 1080×1920 canvas for portrait OBS browser sources. */
export function VerticalStage({ children }: { children: ReactNode }) {
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scale = Math.min(
        window.innerWidth / STAGE_W,
        window.innerHeight / STAGE_H,
        1
      );
      setStageScale(scale);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const scaledW = STAGE_W * stageScale;
  const scaledH = STAGE_H * stageScale;

  return (
    <div className="flex h-[100dvh] w-full items-end justify-center overflow-hidden bg-transparent">
      <div className="relative shrink-0" style={{ width: scaledW, height: scaledH }}>
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden bg-transparent"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${stageScale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
