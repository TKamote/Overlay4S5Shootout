"use client";

import type { GameMode } from "@/hooks/useOverlayMatch";

const OPTIONS: { mode: GameMode; label: string }[] = [
  { mode: "9-ball", label: "9" },
  { mode: "10-ball", label: "10" },
  { mode: "8-ball", label: "8" },
];

/** Compact 9 / 10 / 8 selector (8 = no ball rack). */
export default function GameModeControl({
  gameMode,
  canEdit,
  onChange,
}: {
  gameMode: GameMode;
  canEdit: boolean;
  onChange: (mode: GameMode) => void;
}) {
  if (!canEdit) {
    const label = OPTIONS.find((o) => o.mode === gameMode)?.label ?? "9";
    return (
      <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-500" title="Game mode">
        {label}-ball
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-neutral-100 p-0.5" title="Balls: 9 / 10 / 8 (none)">
      {OPTIONS.map(({ mode, label }) => {
        const active = gameMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`min-w-[1.75rem] rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums transition-colors ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
