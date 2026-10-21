import {
  BallNumberText,
  clampBall,
  isStripe,
  pocketedClass,
  StripeBand,
  type BallVisualProps,
} from "./shared";
import { PRO_GLOSS_SOLID, solidColorFor } from "@/lib/ballStyles";

/** Soft glossy broadcast sphere. */
export default function ProGlossBall({
  number,
  size = 44,
  pocketed = false,
  className = "",
}: BallVisualProps) {
  const n = clampBall(number);
  const color = solidColorFor(n, PRO_GLOSS_SOLID);
  const stripe = isStripe(n);
  const id = `progloss-${n}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={pocketedClass(pocketed, `drop-shadow-sm ${className}`)}
      aria-label={`Ball ${n}`}
      role="img"
    >
      <defs>
        <radialGradient id={`${id}-shine`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill={stripe ? "#EEEEEE" : color} />
      {stripe && <StripeBand color={color} clipId={`${id}-clip`} />}
      <circle cx="32" cy="32" r="12" fill="#FAFAFA" />
      <BallNumberText n={n} fontSize={n >= 10 ? 13 : 15} />
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-shine)`} />
      <circle cx="32" cy="32" r="29.5" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    </svg>
  );
}
