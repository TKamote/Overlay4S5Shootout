import Image from "next/image";
import {
  BallNumberText,
  clampBall,
  isStripe,
  pocketedClass,
  StripeBand,
  type BallVisualProps,
} from "./shared";
import { BROADCAST_SOLID, solidColorFor } from "@/lib/ballStyles";

/** PNG ballicons (1–10); SVG stripe fallback for 11–15. */
export default function ClassicBall({
  number,
  size = 44,
  pocketed = false,
  className = "",
}: BallVisualProps) {
  const n = clampBall(number);

  if (n <= 10) {
    return (
      <Image
        src={`/ballicons/ball-${n}.png`}
        alt={`Ball ${n}`}
        width={size}
        height={size}
        className={pocketedClass(pocketed, `object-contain ${className}`)}
        unoptimized
      />
    );
  }

  const color = solidColorFor(n, BROADCAST_SOLID);
  const id = `classic-stripe-${n}-${size}`;

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
      <circle cx="32" cy="32" r="30" fill="#F5F5F5" />
      {isStripe(n) && <StripeBand color={color} clipId={`${id}-clip`} />}
      <circle cx="32" cy="32" r="11" fill="#F8F8F8" />
      <BallNumberText n={n} fontSize={14} />
    </svg>
  );
}
