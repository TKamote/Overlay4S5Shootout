"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LogoSelectionModal from "@/components/LogoSelectionModal";
import PlayerSelectionModal from "@/components/PlayerSelectionModal";
import WinnerModal from "@/components/WinnerModal";
import { RUNNING_SUBTITLE_MAX_LEN } from "@/components/RunningSubtitleTicker";
import { TOURNAMENT_TITLE_MAX_LEN } from "@/components/TournamentTitleBanner";
import { BallRack } from "@/components/ui/BallRack";
import { RaceControl } from "@/components/ui/RaceControl";
import { ScoreControl } from "@/components/ui/ScoreControl";
import { useOverlayLogos } from "@/hooks/useOverlayLogos";
import { placeholderFor, useOverlayMatch } from "@/hooks/useOverlayMatch";

const PHOTO = 40;

/** Mobile-first phone controller for the landscape match. */
export default function LandscapeController({ matchId }: { matchId: string }) {
  const m = useOverlayMatch({
    matchId,
    enableBalls: true,
    rackStyle: "full",
    defaultRaceTo: 10,
    enableKeyboard: false,
  });
  const { canEdit } = m;
  const logos = useOverlayLogos(matchId, {
    canEdit,
    editToken: m.editToken,
  });
  const [tempTitle, setTempTitle] = useState(m.tournamentTitle);
  const [tempSubtitle, setTempSubtitle] = useState(m.runningSubtitle);

  useEffect(() => {
    setTempTitle(m.tournamentTitle);
  }, [m.tournamentTitle]);
  useEffect(() => {
    setTempSubtitle(m.runningSubtitle);
  }, [m.runningSubtitle]);

  const commitTitle = () => {
    if (!canEdit) return;
    m.saveTournamentTitle(tempTitle);
  };

  const commitSubtitle = () => {
    if (!canEdit) return;
    m.saveRunningSubtitle(tempSubtitle);
  };

  const photoClass = `relative shrink-0 overflow-hidden rounded-xl border-2 border-white/40 shadow-md ${
    canEdit ? "active:opacity-80" : ""
  }`;

  if (m.loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 p-3 text-neutral-600">
        Loading controller…
      </main>
    );
  }

  return (
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-neutral-100 px-2 pt-4"
      style={{
        paddingBottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))",
      }}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Scoreboard
          </p>
          <h1 className="text-xl font-bold text-neutral-900">Controller</h1>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 active:bg-neutral-50"
        >
          Hub
        </Link>
      </header>

      {!canEdit && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
          View only — sign in or open your edit link to change scores
        </p>
      )}

      <section className="w-full overflow-hidden rounded-2xl shadow-sm">
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background:
              "linear-gradient(to bottom, #E23A4A 0%, #E23A4A 48%, #B81E2E 52%, #B81E2E 100%)",
          }}
        >
          <button
            type="button"
            onClick={() => canEdit && m.setShowPlayer1Modal(true)}
            className={photoClass}
            style={{ width: PHOTO, height: PHOTO }}
            title={canEdit ? "Select Player A" : undefined}
          >
            <Image
              src={m.getPlayer1Photo() || placeholderFor(m.player1, "player1")}
              alt={m.getPlayer1Name()}
              width={PHOTO}
              height={PHOTO}
              className="h-full w-full object-cover"
              unoptimized
            />
          </button>
          <button
            type="button"
            onClick={() => canEdit && m.setShowPlayer1Modal(true)}
            className={`min-w-0 flex-1 break-words text-left text-sm font-bold uppercase tracking-wide text-white ${
              canEdit ? "active:opacity-80" : ""
            }`}
          >
            {m.getPlayer1Name()}
          </button>
          <div className="shrink-0">
            <ScoreControl
              value={m.player1Score}
              canEdit={canEdit}
              side="red"
              variant="phone"
              onInc={() => m.setPlayer1Score((p) => p + 1)}
              onDec={() => m.setPlayer1Score((p) => Math.max(0, p - 1))}
            />
          </div>
        </div>

        <RaceControl
          m={{ ...m, canEdit }}
          variant="phone"
          className="bg-indigo-950 px-0.5"
          style={{ minHeight: 44 }}
        />

        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background:
              "linear-gradient(to bottom, #3B6FCF 0%, #3B6FCF 48%, #1A4A9A 52%, #1A4A9A 100%)",
          }}
        >
          <button
            type="button"
            onClick={() => canEdit && m.setShowPlayer2Modal(true)}
            className={photoClass}
            style={{ width: PHOTO, height: PHOTO }}
            title={canEdit ? "Select Player B" : undefined}
          >
            <Image
              src={m.getPlayer2Photo() || placeholderFor(m.player2, "player2")}
              alt={m.getPlayer2Name()}
              width={PHOTO}
              height={PHOTO}
              className="h-full w-full object-cover"
              unoptimized
            />
          </button>
          <button
            type="button"
            onClick={() => canEdit && m.setShowPlayer2Modal(true)}
            className={`min-w-0 flex-1 break-words text-left text-sm font-bold uppercase tracking-wide text-white ${
              canEdit ? "active:opacity-80" : ""
            }`}
          >
            {m.getPlayer2Name()}
          </button>
          <div className="shrink-0">
            <ScoreControl
              value={m.player2Score}
              canEdit={canEdit}
              side="blue"
              variant="phone"
              onInc={() => m.setPlayer2Score((p) => p + 1)}
              onDec={() => m.setPlayer2Score((p) => Math.max(0, p - 1))}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Balls</h2>
        {m.rackBalls.length > 0 ? (
          <BallRack m={m} ballSize={40} variant="phone" />
        ) : (
          <p className="rounded-xl bg-white px-3 py-4 text-center text-sm text-neutral-500 shadow-sm">
            No rack for this game mode (set 9/10-ball in Manage players).
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Logos</h2>
        <div className="grid grid-cols-3 gap-2">
          <LogoPickCard
            label="Logo 1"
            logoURL={logos.logo1URL}
            canEdit={canEdit}
            onPick={() => logos.setShowLogo1Modal(true)}
            onClear={() => logos.handleClearLogo(1)}
          />
          <LogoPickCard
            label="Logo 2"
            logoURL={logos.logo2URL}
            canEdit={canEdit}
            onPick={() => logos.setShowLogo2Modal(true)}
            onClear={() => logos.handleClearLogo(2)}
          />
          <LogoPickCard
            label="Logo 3"
            logoURL={logos.logo3URL}
            canEdit={canEdit}
            onPick={() => logos.setShowLogo3Modal(true)}
            onClear={() => logos.handleClearLogo(3)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Tournament title</h2>
        <div className="relative flex min-h-11 w-full items-center rounded-xl border border-neutral-300 bg-white focus-within:border-blue-500">
          <input
            type="text"
            value={tempTitle}
            maxLength={TOURNAMENT_TITLE_MAX_LEN}
            disabled={!canEdit}
            onChange={(e) =>
              setTempTitle(e.target.value.slice(0, TOURNAMENT_TITLE_MAX_LEN))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              }
            }}
            placeholder="Overlays4 Series1"
            className="min-h-11 w-full flex-1 rounded-xl bg-transparent py-2.5 pl-3 pr-24 text-base text-neutral-900 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!canEdit}
            onClick={commitTitle}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white active:opacity-90 disabled:opacity-50"
          >
            Update
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          {tempTitle.length}/{TOURNAMENT_TITLE_MAX_LEN} — shown centered on OBS
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Running subtitle</h2>
        <div className="relative flex min-h-11 w-full items-center rounded-xl border border-neutral-300 bg-white focus-within:border-blue-500">
          <input
            type="text"
            value={tempSubtitle}
            maxLength={RUNNING_SUBTITLE_MAX_LEN}
            disabled={!canEdit}
            onChange={(e) =>
              setTempSubtitle(e.target.value.slice(0, RUNNING_SUBTITLE_MAX_LEN))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSubtitle();
              }
            }}
            className="min-h-11 w-full flex-1 rounded-xl bg-transparent py-2.5 pl-3 pr-24 text-base text-neutral-900 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!canEdit}
            onClick={commitSubtitle}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white active:opacity-90 disabled:opacity-50"
          >
            Update
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          {tempSubtitle.length}/{RUNNING_SUBTITLE_MAX_LEN} — ticker under title (30s every
          90s). Blank hides it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Scoreboard</h2>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => m.setScoreboardHidden(!m.scoreboardHidden)}
          className={`min-h-12 w-full rounded-2xl px-4 py-3 text-center text-base font-semibold active:opacity-90 disabled:opacity-50 ${
            m.scoreboardHidden
              ? "bg-slate-800 text-white shadow-sm"
              : "border border-neutral-300 bg-white text-neutral-900"
          }`}
        >
          {m.scoreboardHidden ? "Scoreboard hidden — tap to show" : "Hide scoreboard"}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Standby</h2>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => m.setIsStandby(!m.isStandby)}
          className={`min-h-12 w-full rounded-2xl px-4 py-3 text-center text-base font-semibold active:opacity-90 disabled:opacity-50 ${
            m.isStandby
              ? "bg-amber-500 text-amber-950 shadow-sm"
              : "border border-neutral-300 bg-white text-neutral-900"
          }`}
        >
          {m.isStandby ? "Standby ON — tap to hide" : "Standby"}
        </button>
      </section>

      <PlayerSelectionModal
        isOpen={m.showPlayer1Modal}
        onClose={() => m.setShowPlayer1Modal(false)}
        players={m.players}
        selectedPlayerId={m.player1?.id || null}
        onSelect={m.handlePlayer1Select}
        title="Select Player A"
      />
      <PlayerSelectionModal
        isOpen={m.showPlayer2Modal}
        onClose={() => m.setShowPlayer2Modal(false)}
        players={m.players}
        selectedPlayerId={m.player2?.id || null}
        onSelect={m.handlePlayer2Select}
        title="Select Player B"
      />
      <LogoSelectionModal
        isOpen={logos.showLogo1Modal}
        onClose={() => logos.setShowLogo1Modal(false)}
        logos={logos.logos}
        selectedLogoURL={logos.logo1URL || null}
        onSelect={(logo) => {
          logos.handleSelectLogo(1, logo);
          logos.setShowLogo1Modal(false);
        }}
        title="Select Logo 1"
      />
      <LogoSelectionModal
        isOpen={logos.showLogo2Modal}
        onClose={() => logos.setShowLogo2Modal(false)}
        logos={logos.logos}
        selectedLogoURL={logos.logo2URL || null}
        onSelect={(logo) => {
          logos.handleSelectLogo(2, logo);
          logos.setShowLogo2Modal(false);
        }}
        title="Select Logo 2"
      />
      <LogoSelectionModal
        isOpen={logos.showLogo3Modal}
        onClose={() => logos.setShowLogo3Modal(false)}
        logos={logos.logos}
        selectedLogoURL={logos.logo3URL || null}
        onSelect={(logo) => {
          logos.handleSelectLogo(3, logo);
          logos.setShowLogo3Modal(false);
        }}
        title="Select Logo 3"
      />
      <WinnerModal
        isOpen={m.showWinnerModal}
        onClose={m.handleWinnerModalClose}
        winner={
          m.winner
            ? {
                id: m.winner.id,
                name: m.winner.name,
                photoURL: m.winner.photoURL,
                points: m.winner.points || 0,
              }
            : null
        }
        getPlayerPlaceholder={(playerId) => {
          const hash = playerId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return `/avatar-placeholder-${(hash % 6) + 1}.svg`;
        }}
        player1Score={m.player1Score}
        player2Score={m.player2Score}
        player1Name={m.getPlayer1Name()}
        player2Name={m.getPlayer2Name()}
      />
    </main>
  );
}

function LogoPickCard({
  label,
  logoURL,
  canEdit,
  onPick,
  onClear,
}: {
  label: string;
  logoURL: string;
  canEdit: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  const hasLogo = Boolean(logoURL);
  return (
    <div className="relative rounded-2xl bg-white p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <button
        type="button"
        onClick={() => canEdit && onPick()}
        disabled={!canEdit}
        className={`flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border-2 ${
          hasLogo ? "border-neutral-200 bg-white" : "border-dashed border-neutral-300 bg-neutral-50"
        } ${canEdit ? "active:opacity-80" : "opacity-80"}`}
        title={canEdit ? `Pick ${label}` : undefined}
      >
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoURL} alt={label} className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-sm text-neutral-400">{canEdit ? "Tap to pick" : "Empty"}</span>
        )}
      </button>
      {canEdit && hasLogo && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-4 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg leading-none text-white active:bg-black/70"
          title={`Clear ${label}`}
          aria-label={`Clear ${label}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
