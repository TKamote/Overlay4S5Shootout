"use client";

import TournamentTitleBanner from "@/components/TournamentTitleBanner";
import RunningSubtitleTicker from "@/components/RunningSubtitleTicker";

/** Title + optional running subtitle stacked at the top of landscape OBS. */
export default function LandscapeTopBanners({
  title,
  runningSubtitle,
}: {
  title: string;
  runningSubtitle: string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex w-full flex-col items-center"
      style={{ top: 30, gap: 20 }}
    >
      <TournamentTitleBanner title={title} />
      <RunningSubtitleTicker text={runningSubtitle} />
    </div>
  );
}
