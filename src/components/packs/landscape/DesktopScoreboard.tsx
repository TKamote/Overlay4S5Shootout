import Image from "next/image";
import { LowerThirdMotion } from "@/components/LowerThirdMotion";
import { placeholderFor, type OverlayPlayer } from "@/hooks/useOverlayMatch";
import { FoldedBar } from "@/components/ui/FoldedBar";
import { ScoreControl } from "@/components/ui/ScoreControl";
import { RaceControl, RaceMatch } from "@/components/ui/RaceControl";
import { BallRack, BallMatch } from "@/components/ui/BallRack";

const BAR_H = 72;
const PHOTO_SIZE = 98;
const BALL_SIZE = 48;

type DesktopScoreboardMatch = RaceMatch & BallMatch & {
  player1: OverlayPlayer | null;
  player2: OverlayPlayer | null;
  player1Score: number;
  player2Score: number;
  setPlayer1Score: (updater: (p: number) => number) => void;
  setPlayer2Score: (updater: (p: number) => number) => void;
  getPlayer1Photo: () => string | null;
  getPlayer2Photo: () => string | null;
  getPlayer1Name: () => string;
  getPlayer2Name: () => string;
  setShowPlayer1Modal: (v: boolean) => void;
  setShowPlayer2Modal: (v: boolean) => void;
  canEdit: boolean;
  scoreboardHidden: boolean;
};

export function DesktopScoreboard({ m, canEdit }: { m: DesktopScoreboardMatch; canEdit: boolean }) {
  const photoClass = `relative z-10 shrink-0 overflow-hidden rounded-[20%] border border-white/40 shadow-md ${
    canEdit ? "cursor-pointer hover:opacity-90" : "cursor-default"
  }`;
  const nameClass = `mx-2 min-w-0 flex-1 appearance-none truncate border-0 bg-transparent p-0 text-[32px] font-bold uppercase leading-none tracking-wide text-white shadow-none outline-none ${
    canEdit ? "cursor-pointer hover:opacity-90" : "cursor-default"
  }`;

  return (
    <LowerThirdMotion hidden={m.scoreboardHidden}>
      <div className="mx-auto flex w-full flex-col items-center gap-3 px-3 sm:w-[85%] sm:px-4 min-[1375px]:w-[80%]">
      <div className="relative flex w-full items-center overflow-visible" style={{ minHeight: PHOTO_SIZE }}>
        <div className="flex w-full items-center overflow-visible">
          <FoldedBar side="red" height={BAR_H} className="rounded-l-sm pl-1">
            <button
              type="button"
              onClick={() => canEdit && m.setShowPlayer1Modal(true)}
              className={photoClass}
              style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, marginLeft: 4 }}
              title={canEdit ? "Select Player A" : undefined}
            >
              <Image
                src={m.getPlayer1Photo() || placeholderFor(m.player1, "player1")}
                alt={m.getPlayer1Name()}
                width={PHOTO_SIZE}
                height={PHOTO_SIZE}
                className="h-full w-full object-cover"
                unoptimized
              />
            </button>
            <button
              type="button"
              onClick={() => canEdit && m.setShowPlayer1Modal(true)}
              className={`${nameClass} text-left`}
            >
              {m.getPlayer1Name()}
            </button>
            <ScoreControl
              value={m.player1Score}
              canEdit={canEdit}
              side="red"
              variant="desktop"
              marginClass="mr-[10px] sm:mr-[2px]"
              onInc={() => m.setPlayer1Score((p) => p + 1)}
              onDec={() => m.setPlayer1Score((p) => Math.max(0, p - 1))}
            />
          </FoldedBar>

          <RaceControl
            m={m}
            variant="desktop"
            className="relative z-[3] bg-indigo-950 px-3 shadow-sm sm:px-4"
            style={{ height: BAR_H, minWidth: 110 }}
          />

          <FoldedBar side="blue" height={BAR_H} className="rounded-r-sm pr-1">
            <ScoreControl
              value={m.player2Score}
              canEdit={canEdit}
              side="blue"
              variant="desktop"
              marginClass="ml-[10px] sm:ml-[2px]"
              onInc={() => m.setPlayer2Score((p) => p + 1)}
              onDec={() => m.setPlayer2Score((p) => Math.max(0, p - 1))}
            />
            <button
              type="button"
              onClick={() => canEdit && m.setShowPlayer2Modal(true)}
              className={`${nameClass} text-right`}
            >
              {m.getPlayer2Name()}
            </button>
            <button
              type="button"
              onClick={() => canEdit && m.setShowPlayer2Modal(true)}
              className={photoClass}
              style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, marginRight: 4 }}
              title={canEdit ? "Select Player B" : undefined}
            >
              <Image
                src={m.getPlayer2Photo() || placeholderFor(m.player2, "player2")}
                alt={m.getPlayer2Name()}
                width={PHOTO_SIZE}
                height={PHOTO_SIZE}
                className="h-full w-full object-cover"
                unoptimized
              />
            </button>
          </FoldedBar>
        </div>
      </div>

      <BallRack m={m} ballSize={BALL_SIZE} variant="desktop" />
      </div>
    </LowerThirdMotion>
  );
}
