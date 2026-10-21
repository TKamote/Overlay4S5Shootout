"use client";

export const TOURNAMENT_TITLE_MAX_LEN = 50;
export const DEFAULT_TOURNAMENT_TITLE_DISPLAY = "Overlay4S5 Shootout";

/** OBS landscape tournament title — top, horizontally centered, non-interactive. */
export default function TournamentTitleBanner({
  title,
}: {
  title: string;
}) {
  const display =
    (title || "").trim().slice(0, TOURNAMENT_TITLE_MAX_LEN) ||
    DEFAULT_TOURNAMENT_TITLE_DISPLAY;

  return (
    <div
      className="max-w-[90%] truncate px-6 py-2 text-center font-bold tracking-wide text-white"
      style={{
        background:
          "linear-gradient(180deg, rgba(12,14,18,0.72) 0%, rgba(12,14,18,0.55) 100%)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: 12,
        fontSize: 48,
        lineHeight: 1.2,
        letterSpacing: "0.04em",
        textShadow: "0 2px 8px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.5)",
      }}
      title={display}
    >
      {display}
    </div>
  );
}
