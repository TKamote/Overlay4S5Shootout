import {
  BallNumberText,
  clampBall,
  isStripe,
  pocketedClass,
  StripeBand,
  type BallVisualProps,
} from "./shared";
import { BROADCAST_FLAT_SOLID, solidColorFor } from "@/lib/ballStyles";

/** Flat pastel ball with white inner disc. */
export default function BroadcastFlatBall({
  number,
  size = 44,
  pocketed = false,
  className = "",
}: BallVisualProps) {
  const n = clampBall(number);
  const color = solidColorFor(n, BROADCAST_FLAT_SOLID);
  const stripe = isStripe(n);
  const id = `broadcast-${n}-${size}`;
  const innerR = 17;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={pocketedClass(pocketed, className)}
      aria-label={`Ball ${n}`}
      role="img"
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill={stripe ? "#E0E0E0" : color} />
      {stripe && <StripeBand color={color} clipId={`${id}-clip`} />}
      <circle cx="32" cy="32" r={innerR} fill="#F0F0F0" />
      <BallNumberText n={n} fontSize={n >= 10 ? 13 : 15} />
    </svg>
  );
}
