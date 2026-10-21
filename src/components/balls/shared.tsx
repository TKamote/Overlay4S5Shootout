import { isStripeBall } from "@/lib/ballStyles";

export type BallVisualProps = {
  number: number;
  size?: number;
  pocketed?: boolean;
  className?: string;
};

export function clampBall(n: number): number {
  return Math.min(15, Math.max(1, Math.round(n)));
}

export function pocketedClass(pocketed: boolean, className: string): string {
  return `shrink-0 ${pocketed ? "opacity-20" : ""} ${className}`.trim();
}

export function BallNumberText({
  n,
  fontSize,
  fill = "#111",
}: {
  n: number;
  fontSize: number;
  fill?: string;
}) {
  return (
    <text
      x="32"
      y="32"
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontSize={fontSize}
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      {n}
    </text>
  );
}

export function StripeBand({
  color,
  clipId,
}: {
  color: string;
  clipId: string;
}) {
  return (
    <g clipPath={`url(#${clipId})`}>
      <rect x="0" y="20" width="64" height="24" fill={color} />
    </g>
  );
}

export function isStripe(n: number): boolean {
  return isStripeBall(n);
}
