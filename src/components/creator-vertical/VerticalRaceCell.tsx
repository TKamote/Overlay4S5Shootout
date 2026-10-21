"use client";

import { RACE_TEXT_CLASS } from "@/lib/creatorVerticalSpacing";

type RaceMatch = {
  raceTo: number;
  showRaceToInput: boolean;
  tempRaceTo: string;
  setTempRaceTo: (v: string) => void;
  handleRaceToChange: () => void;
  setShowRaceToInput: (v: boolean) => void;
  canEdit: boolean;
};

type VerticalRaceCellProps = {
  m: RaceMatch;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  darkText?: boolean;
};

/** Compact R{n} race label with manager click-to-edit. */
export function VerticalRaceCell({
  m,
  className = "flex h-full w-14 shrink-0 items-center justify-center px-1",
  textClassName = `${RACE_TEXT_CLASS} text-[35px] px-[1px]`,
  inputClassName = "w-12 text-center text-[31px] font-bold bg-transparent border-2 rounded px-0.5 outline-none",
  darkText = false,
}: VerticalRaceCellProps) {
  const textColor = darkText ? "text-neutral-900" : "text-white";
  const borderColor = darkText ? "border-neutral-400" : "border-white";

  if (m.showRaceToInput && m.canEdit) {
    return (
      <div className={className}>
        <input
          autoFocus
          type="number"
          min={1}
          max={50}
          value={m.tempRaceTo}
          onChange={(e) => m.setTempRaceTo(e.target.value)}
          onBlur={m.handleRaceToChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") m.handleRaceToChange();
            if (e.key === "Escape") {
              m.setTempRaceTo(String(m.raceTo));
              m.setShowRaceToInput(false);
            }
          }}
          className={`${inputClassName} ${textColor} ${borderColor}`}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          if (!m.canEdit) return;
          m.setTempRaceTo(String(m.raceTo));
          m.setShowRaceToInput(true);
        }}
        className={`${textClassName} ${textColor} ${
          m.canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"
        }`}
        title={m.canEdit ? "Click to edit race" : undefined}
      >
        R{m.raceTo}
      </button>
    </div>
  );
}
