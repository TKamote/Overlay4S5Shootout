import Image from "next/image";
import StreamEdgeBall from "./StreamEdgeBall";
import { clampBall, pocketedClass, type BallVisualProps } from "./shared";

/** Stream Edge look; balls 1–10 use Classic PNG number orientation. */
export default function Set5Ball({
  number,
  size = 44,
  pocketed = false,
  className = "",
}: BallVisualProps) {
  const n = clampBall(number);

  if (n > 10) {
    return (
      <StreamEdgeBall
        number={n}
        size={size}
        pocketed={pocketed}
        className={className}
      />
    );
  }

  return (
    <span
      className={pocketedClass(pocketed, `relative inline-block shrink-0 ${className}`)}
      style={{ width: size, height: size }}
      aria-label={`Ball ${n}`}
      role="img"
    >
      <Image
        src={`/ballicons/ball-${n}.png`}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        unoptimized
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 64 64"
        aria-hidden
      >
        <circle cx="32" cy="32" r="29" fill="none" stroke="#0d0d0d" strokeWidth="2.5" />
        <circle cx="22" cy="22" r="4" fill="#ffffff" opacity="0.65" />
      </svg>
    </span>
  );
}
