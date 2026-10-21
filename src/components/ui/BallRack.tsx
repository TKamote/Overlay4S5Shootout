import RackBall from "@/components/balls/RackBall";
import { DEFAULT_BALL_STYLE, type BallStyleId } from "@/lib/ballStyles";

export type BallMatch = {
  rackBalls: number[];
  pocketedBalls: Set<number>;
  handleBallClick: (n: number) => void;
  handleResetBalls: () => void;
  ballStyle?: BallStyleId;
};

export function BallRack({
  m,
  ballSize,
  variant,
}: {
  m: BallMatch;
  ballSize: number;
  variant: "desktop" | "phone" | "vertical";
}) {
  if (m.rackBalls.length === 0) return null;
  const style = m.ballStyle ?? DEFAULT_BALL_STYLE;

  if (variant === "phone") {
    return (
      <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/95 px-3 py-2.5 shadow-sm">
        {m.rackBalls.map((n) => {
          const pocketed = m.pocketedBalls.has(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => m.handleBallClick(n)}
              className="shrink-0 active:opacity-80"
              title={pocketed ? "Ball pocketed" : "Click to pocket/unpocket"}
            >
              <RackBall variant={style} number={n} size={ballSize} pocketed={pocketed} />
            </button>
          );
        })}
        <button
          type="button"
          onClick={m.handleResetBalls}
          className="shrink-0 p-2 text-gray-400 opacity-60 active:opacity-100"
          title="Reset all balls"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 shadow-sm ${variant === "vertical" ? "max-w-full" : ""}`}>
      {m.rackBalls.map((n) => {
        const pocketed = m.pocketedBalls.has(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => m.handleBallClick(n)}
            className={`shrink-0 transition-transform ${pocketed ? "" : "hover:scale-110"}`}
            title={pocketed ? "Ball pocketed" : "Click to pocket/unpocket"}
          >
            <RackBall variant={style} number={n} size={ballSize} pocketed={pocketed} />
          </button>
        );
      })}
      {variant === "desktop" && (
        <button
          type="button"
          onClick={m.handleResetBalls}
          className="shrink-0 text-gray-400 opacity-50 transition-opacity hover:opacity-100"
          title="Reset all balls"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
