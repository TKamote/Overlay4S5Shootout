import { overlayTheme } from "@/lib/overlayTheme";

export type RaceMatch = {
  raceTo: number;
  setRaceTo: (v: React.SetStateAction<number>) => void;
  showRaceToInput: boolean;
  setShowRaceToInput: (v: boolean) => void;
  tempRaceTo: string;
  setTempRaceTo: (v: string) => void;
  handleRaceToChange: () => void;
  canEdit: boolean;
};

export function RaceControl({
  m,
  variant,
  className = "",
  style,
}: {
  m: RaceMatch;
  variant: "desktop" | "phone" | "vertical";
  className?: string;
  style?: React.CSSProperties;
}) {
  if (m.showRaceToInput && m.canEdit) {
    if (variant === "phone") {
      return (
        <div className={`flex shrink-0 items-center justify-center ${className}`} style={style}>
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
            className="w-10 appearance-none border-0 bg-transparent text-center text-lg font-bold text-white outline-none"
          />
        </div>
      );
    } else {
      return (
        <div className={`flex shrink-0 flex-col items-center justify-center ${className}`} style={style}>
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
            className="w-16 appearance-none border-0 bg-transparent text-center text-[25.6px] font-bold text-white outline-none"
          />
        </div>
      );
    }
  }

  if (variant === "phone") {
    const btnSize = 32;
    if (m.canEdit) {
      return (
        <div className={`flex shrink-0 items-center justify-center ${className}`} style={style}>
          <button
            type="button"
            className="flex shrink-0 appearance-none items-center justify-center border-0 bg-transparent p-0 text-xl font-bold leading-none outline-none active:opacity-70"
            style={{ color: overlayTheme.colors.phoneGlyphRace, width: btnSize, height: btnSize }}
            onClick={() => {
              m.setRaceTo((prev) => {
                const next = Math.max(1, prev - 1);
                m.setTempRaceTo(String(next));
                return next;
              });
            }}
            aria-label="Decrease race to"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              m.setTempRaceTo(String(m.raceTo));
              m.setShowRaceToInput(true);
            }}
            className="appearance-none border-0 bg-transparent px-0.5 py-0 text-lg font-bold text-white outline-none active:opacity-80"
            title="Tap to type race to"
          >
            R{m.raceTo}
          </button>
          <button
            type="button"
            className="flex shrink-0 appearance-none items-center justify-center border-0 bg-transparent p-0 text-xl font-bold leading-none outline-none active:opacity-70"
            style={{ color: overlayTheme.colors.phoneGlyphRace, width: btnSize, height: btnSize }}
            onClick={() => {
              m.setRaceTo((prev) => {
                const next = Math.min(50, prev + 1);
                m.setTempRaceTo(String(next));
                return next;
              });
            }}
            aria-label="Increase race to"
          >
            +
          </button>
        </div>
      );
    } else {
      return (
        <div className={`flex shrink-0 items-center justify-center ${className}`} style={style}>
          <span className="px-2 text-lg font-bold text-white">R{m.raceTo}</span>
        </div>
      );
    }
  }

  // Desktop / Vertical variants
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center ${className}`} style={style}>
      <button
        type="button"
        onClick={() => {
          if (!m.canEdit) return;
          m.setTempRaceTo(String(m.raceTo));
          m.setShowRaceToInput(true);
        }}
        className={`appearance-none border-0 bg-transparent p-0 text-[25.6px] font-bold text-white outline-none ${
          m.canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"
        }`}
        title={m.canEdit ? "Click to edit race to" : undefined}
      >
        Race to {m.raceTo}
      </button>
    </div>
  );
}
