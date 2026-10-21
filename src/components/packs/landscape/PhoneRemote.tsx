import Image from "next/image";
import { placeholderFor, type OverlayPlayer } from "@/hooks/useOverlayMatch";
import { FoldedBar } from "@/components/ui/FoldedBar";
import { ScoreControl } from "@/components/ui/ScoreControl";
import { RaceControl, RaceMatch } from "@/components/ui/RaceControl";
import { BallRack, BallMatch } from "@/components/ui/BallRack";

const PHONE_BAR_H = 44;
const PHONE_PHOTO = 36;
const PHONE_BALL = 28;

type PhoneRemoteMatch = RaceMatch & BallMatch & {
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
  isStandby: boolean;
  setIsStandby: (value: boolean | ((prev: boolean) => boolean)) => void;
};

export function PhoneRemote({ m, canEdit }: { m: PhoneRemoteMatch; canEdit: boolean }) {
  const photoClass = `relative shrink-0 overflow-hidden rounded-[20%] border border-white/40 shadow-md ${
    canEdit ? "active:opacity-80" : ""
  }`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-3">
      {!canEdit && (
        <p className="text-center text-xs text-neutral-500">
          View only — sign in or open your edit link to change scores
        </p>
      )}

      <div className="flex w-full items-stretch overflow-hidden rounded-md shadow-sm">
        {/* Player A */}
        <FoldedBar side="red" height={PHONE_BAR_H} className="pl-1 pr-0.5 gap-1">
          <button
            type="button"
            onClick={() => canEdit && m.setShowPlayer1Modal(true)}
            className={photoClass}
            style={{ width: PHONE_PHOTO, height: PHONE_PHOTO }}
            title={canEdit ? "Select Player A" : undefined}
          >
            <Image
              src={m.getPlayer1Photo() || placeholderFor(m.player1, "player1")}
              alt={m.getPlayer1Name()}
              width={PHONE_PHOTO}
              height={PHONE_PHOTO}
              className="h-full w-full object-cover"
              unoptimized
            />
          </button>
          <div className="ml-auto">
            <ScoreControl
              value={m.player1Score}
              canEdit={canEdit}
              side="red"
              variant="phone"
              onInc={() => m.setPlayer1Score((p) => p + 1)}
              onDec={() => m.setPlayer1Score((p) => Math.max(0, p - 1))}
            />
          </div>
        </FoldedBar>

        {/* Race */}
        <RaceControl
          m={m}
          variant="phone"
          className="bg-indigo-950 px-0.5"
          style={{ height: PHONE_BAR_H, minWidth: canEdit ? 86 : 48 }}
        />

        {/* Player B */}
        <FoldedBar side="blue" height={PHONE_BAR_H} className="pl-0.5 pr-1 gap-1">
          <ScoreControl
            value={m.player2Score}
            canEdit={canEdit}
            side="blue"
            variant="phone"
            onInc={() => m.setPlayer2Score((p) => p + 1)}
            onDec={() => m.setPlayer2Score((p) => Math.max(0, p - 1))}
          />
          <button
            type="button"
            onClick={() => canEdit && m.setShowPlayer2Modal(true)}
            className={`${photoClass} ml-auto`}
            style={{ width: PHONE_PHOTO, height: PHONE_PHOTO }}
            title={canEdit ? "Select Player B" : undefined}
          >
            <Image
              src={m.getPlayer2Photo() || placeholderFor(m.player2, "player2")}
              alt={m.getPlayer2Name()}
              width={PHONE_PHOTO}
              height={PHONE_PHOTO}
              className="h-full w-full object-cover"
              unoptimized
            />
          </button>
        </FoldedBar>
      </div>

      <BallRack m={m} ballSize={PHONE_BALL} variant="phone" />

      <button
        type="button"
        disabled={!canEdit}
        onClick={() => m.setIsStandby(!m.isStandby)}
        className={`min-h-11 w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold active:opacity-90 disabled:opacity-50 ${
          m.isStandby
            ? "bg-amber-500 text-amber-950 shadow-sm"
            : "border border-white/40 bg-black/50 text-white"
        }`}
      >
        {m.isStandby ? "Standby ON — tap to hide" : "Standby"}
      </button>
    </div>
  );
}
