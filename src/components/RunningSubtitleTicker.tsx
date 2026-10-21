"use client";

import { Outfit } from "next/font/google";
import { useEffect, useState } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["600"],
});

export const RUNNING_SUBTITLE_MAX_LEN = 100;

const TEXT_SHADOW =
  "0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.65)";

const SHOW_MS = 30_000;
const HIDE_MS = 60_000; // 90s cycle from show-start to next show-start

/** OBS landscape marquee — blank text = hidden. */
export default function RunningSubtitleTicker({ text }: { text: string }) {
  const trimmed = (text || "").trim().slice(0, RUNNING_SUBTITLE_MAX_LEN);
  const [visible, setVisible] = useState(Boolean(trimmed));

  useEffect(() => {
    if (!trimmed) {
      setVisible(false);
      return;
    }
    setVisible(true);
    let hideId = 0;
    let showId = 0;
    let cancelled = false;

    const schedule = () => {
      setVisible(true);
      hideId = window.setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        showId = window.setTimeout(() => {
          if (cancelled) return;
          schedule();
        }, HIDE_MS);
      }, SHOW_MS);
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(hideId);
      window.clearTimeout(showId);
    };
  }, [trimmed]);

  if (!trimmed || !visible) return null;

  const segmentClass =
    "inline-block whitespace-nowrap pr-[60px] text-[46px] font-semibold leading-none text-white";

  return (
    <div className={`w-full self-stretch ${outfit.className}`} aria-hidden>
      <div
        className="overflow-hidden"
        style={{ width: "calc(100% - 450px)", marginLeft: 250, marginRight: 200 }}
      >
        <div
          key={trimmed}
          className="landscape-running-subtitle-marquee inline-flex w-max"
        >
          <span className={segmentClass} style={{ textShadow: TEXT_SHADOW }}>
            {trimmed}
          </span>
          <span className={segmentClass} style={{ textShadow: TEXT_SHADOW }}>
            {trimmed}
          </span>
        </div>
      </div>
    </div>
  );
}
