/** SVG pool balls 1–15 (solids / 8 / stripes). Used by creator overlays. */

const BALL_COLORS: Record<number, string> = {
  1: "#F5C518",
  2: "#1E4B9C",
  3: "#C62828",
  4: "#6A1B9A",
  5: "#EF6C00",
  6: "#2E7D32",
  7: "#4E1C16",
  8: "#111111",
  9: "#F5C518",
  10: "#1E4B9C",
  11: "#C62828",
  12: "#6A1B9A",
  13: "#EF6C00",
  14: "#2E7D32",
  15: "#4E1C16",
};

function isStripe(n: number) {
  return n >= 9 && n <= 15;
}

type PoolBallProps = {
  number: number;
  size?: number;
  pocketed?: boolean;
  className?: string;
};

/**
 * Drawn pool ball — solids 1–7, black 8, stripes 9–15.
 * Does not use /ballicons PNGs (those only go to 10).
 */
export default function PoolBall({
  number,
  size = 44,
  pocketed = false,
  className = "",
}: PoolBallProps) {
  const n = Math.min(15, Math.max(1, Math.round(number)));
  const color = BALL_COLORS[n] ?? "#888";
  const stripe = isStripe(n);
  const id = `pool-ball-${n}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 drop-shadow-sm ${pocketed ? "opacity-20" : ""} ${className}`}
      aria-label={`Ball ${n}`}
      role="img"
    >
      <defs>
        <radialGradient id={`${id}-shine`} cx="32%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>

      <circle cx="32" cy="32" r="30" fill={stripe ? "#F5F5F5" : color} />

      {stripe && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="20" width="64" height="24" fill={color} />
        </g>
      )}

      {/* Number disc */}
      <circle cx="32" cy="32" r="11" fill="#F8F8F8" />
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#111"
        fontSize={n >= 10 ? 14 : 16}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {n}
      </text>

      <circle cx="32" cy="32" r="30" fill={`url(#${id}-shine)`} />
      <circle
        cx="32"
        cy="32"
        r="29.5"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
    </svg>
  );
}

export const SOLIDS = [1, 2, 3, 4, 5, 6, 7] as const;
export const STRIPES = [9, 10, 11, 12, 13, 14, 15] as const;
