import { overlayTheme } from "@/lib/overlayTheme";
import { SCORE_CELL_CLASS } from "@/lib/creatorVerticalSpacing";

export type ScoreControlVariant = "desktop" | "phone" | "vertical";

export function ScoreControl({
  value,
  canEdit,
  onInc,
  onDec,
  side,
  variant,
  marginClass = "",
}: {
  value: number;
  canEdit: boolean;
  onInc: () => void;
  onDec: () => void;
  side: "red" | "blue";
  variant: ScoreControlVariant;
  marginClass?: string;
}) {
  let glyphColor = "";
  if (variant === "phone") {
    glyphColor = side === "red" ? overlayTheme.colors.phoneGlyphRed : overlayTheme.colors.phoneGlyphBlue;
  } else {
    glyphColor = side === "red" ? overlayTheme.colors.scoreGlyphRed : overlayTheme.colors.scoreGlyphBlue;
  }

  if (!canEdit) {
    if (variant === "phone") {
      return (
        <span className={`${marginClass} min-w-[2ch] text-center text-xl font-bold tabular-nums text-white`}>
          {value}
        </span>
      );
    } else if (variant === "vertical") {
      return (
        <div className={`${marginClass} ${SCORE_CELL_CLASS} w-14 text-[47px]`}>
          {value}
        </div>
      );
    } else {
      return (
        <span className={`${marginClass} shrink-0 text-[32px] font-bold tabular-nums text-white`}>
          {value}
        </span>
      );
    }
  }

  if (variant === "phone") {
    const btnSize = 32;
    return (
      <div className={`flex shrink-0 items-center ${marginClass}`}>
        <button
          type="button"
          className="flex shrink-0 appearance-none items-center justify-center border-0 bg-transparent p-0 text-xl font-bold leading-none outline-none active:opacity-70"
          style={{ color: glyphColor, width: btnSize, height: btnSize }}
          onClick={onDec}
          aria-label="Decrease score"
        >
          −
        </button>
        <span className="min-w-[1.5ch] text-center text-xl font-bold tabular-nums text-white">{value}</span>
        <button
          type="button"
          className="flex shrink-0 appearance-none items-center justify-center border-0 bg-transparent p-0 text-xl font-bold leading-none outline-none active:opacity-70"
          style={{ color: glyphColor, width: btnSize, height: btnSize }}
          onClick={onInc}
          aria-label="Increase score"
        >
          +
        </button>
      </div>
    );
  }

  if (variant === "vertical") {
    const btnClass = "flex h-8 w-8 shrink-0 items-center justify-center rounded bg-transparent p-0 text-2xl font-bold leading-none outline-none active:opacity-70";
    return (
      <div className={`flex h-full shrink-0 items-center gap-0 px-0.5 ${marginClass}`}>
        <button
          type="button"
          className={btnClass}
          style={{ color: glyphColor }}
          onClick={onDec}
          aria-label="Decrease score"
        >
          −
        </button>
        <div className={`${SCORE_CELL_CLASS} w-14 text-[47px]`}>{value}</div>
        <button
          type="button"
          className={btnClass}
          style={{ color: glyphColor }}
          onClick={onInc}
          aria-label="Increase score"
        >
          +
        </button>
      </div>
    );
  }

  // Desktop variant
  const desktopBtnClass = "flex h-8 w-8 shrink-0 appearance-none items-center justify-center border-0 bg-transparent p-0 text-lg font-bold leading-none outline-none active:opacity-80";
  return (
    <div className={`flex shrink-0 items-center gap-0.5 ${marginClass}`}>
      <button
        type="button"
        className={desktopBtnClass}
        style={{ color: glyphColor }}
        onClick={onDec}
        aria-label="Decrease score"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-[32px] font-bold tabular-nums text-white">{value}</span>
      <button
        type="button"
        className={desktopBtnClass}
        style={{ color: glyphColor }}
        onClick={onInc}
        aria-label="Increase score"
      >
        +
      </button>
    </div>
  );
}
