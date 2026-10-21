import {
  BallNumberText,
  clampBall,
  isStripe,
  pocketedClass,
  StripeBand,
  type BallVisualProps,
} from "./shared";
import { STREAM_EDGE_SOLID, solidColorFor } from "@/lib/ballStyles";

/** High-contrast ball with dark ring and specular dot. */
export default function StreamEdgeBall({
  number,
  size = 44,
  pocketed = false,
  className = "",
}: BallVisualProps) {
  const n = clampBall(number);
  const color = solidColorFor(n, STREAM_EDGE_SOLID);
  const stripe = isStripe(n);
  const id = `stream-${n}-${size}`;

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
      <circle cx="32" cy="32" r="11" fill="#F5F5F5" />
      <BallNumberText n={n} fontSize={n >= 10 ? 13 : 15} />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#0d0d0d" strokeWidth="2.5" />
      <circle cx="22" cy="22" r="4" fill="#ffffff" opacity="0.65" />
    </svg>
  );
}
