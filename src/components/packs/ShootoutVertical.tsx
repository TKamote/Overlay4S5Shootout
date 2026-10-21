"use client";

import {
  useShootoutMatch,
  SHOOTOUT_QUEUE_CAP,
  lingeringShooter,
  clearWinnerFlags,
  declareWinnerPatch,
  flattenTickerText,
  tickerScrollDurationSec,
  type ShootoutPlayer,
} from "@/hooks/useShootoutMatch";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type QueueSlot = { player: ShootoutPlayer; linger: boolean } | null;

function buildQueueSlots(
  active: ShootoutPlayer | undefined,
  waiting: ShootoutPlayer[],
  linger: ShootoutPlayer | undefined
): QueueSlot[] {
  const filled: QueueSlot[] = [];
  if (active) filled.push({ player: active, linger: false });
  else if (linger) filled.push({ player: linger, linger: true });
  for (const p of waiting) filled.push({ player: p, linger: false });
  return Array.from({ length: SHOOTOUT_QUEUE_CAP }, (_, i) => filled[i] ?? null);
}

export default function ShootoutVertical({ matchId }: { matchId: string }) {
  const { state, loading, canEdit, persist } = useShootoutMatch(matchId);

  if (loading) return null;

  if (state.is_standby) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
        <h1 className="mb-6 px-4 text-center text-4xl font-black uppercase tracking-widest text-white drop-shadow-lg">
          {state.title}
        </h1>
        <p className="animate-pulse px-4 text-center text-2xl font-bold text-neutral-300">
          Standby for the {state.title}
        </p>
      </div>
    );
  }

  const finishedPlayers = state.players
    .filter((p) => p.status === "finished")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const activePlayer = state.players.find((p) => p.status === "active");
  const waitingPlayers = state.players.filter((p) => p.status === "waiting");
  const linger = lingeringShooter(state);
  const slots = buildQueueSlots(activePlayer, waitingPlayers, linger);
  const winner = state.players.find((p) => p.isWinner);
  const ticker1 = flattenTickerText(state.ticker_1);
  const ticker2 = flattenTickerText(state.ticker_2);
  const ticker1Duration = tickerScrollDurationSec(ticker1);
  const ticker2Duration = tickerScrollDurationSec(ticker2);

  const handleDeclareWinner = (id: string) => {
    if (!canEdit) return;
    void persist({ players: declareWinnerPatch(state.players, id) });
  };

  const handleDismissWinner = () => {
    void persist({ players: clearWinnerFlags(state.players) });
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-transparent font-sans">
      <AnimatePresence>
        {state.show_sponsor && state.sponsor_image_url && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2">
            <motion.div
              initial={{ y: -200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -200, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="relative overflow-hidden rounded-xl border-2 border-white/20 bg-black shadow-2xl"
              style={{ width: 180, aspectRatio: "16/9" }}
            >
              <Image
                src={state.sponsor_image_url}
                alt="Sponsor"
                fill
                className="object-contain"
                unoptimized
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute left-4 top-4 z-20 flex gap-2 rounded-lg border border-white/10 bg-black/40 p-2 backdrop-blur-sm">
        {[state.logo_1_url, state.logo_2_url, state.logo_3_url].map((url, i) => (
          <div
            key={i}
            className="relative h-[52px] w-[52px] overflow-hidden rounded-full border border-white/20 bg-white/5"
          >
            {url && (
              <Image src={url} alt={`Logo ${i + 1}`} fill className="object-cover" unoptimized />
            )}
          </div>
        ))}
      </div>

      <div className="absolute bottom-32 left-[3%] right-[3%] top-4 z-10 flex flex-col gap-4 pt-16">
        {/* QUEUE — 13 compact slots */}
        <div className="flex shrink-0 flex-col gap-1.5">
          <h2 className="text-right text-sm font-black uppercase tracking-widest text-white/90 drop-shadow-md">
            Up Next
          </h2>
          <div className="flex w-full flex-col items-end gap-1">
            {slots.map((slot, i) => {
              const tier = Math.min(i, 3);
              const widthClass =
                tier === 0 ? "w-[78%]" : tier === 1 ? "w-[70%]" : tier === 2 ? "w-[62%]" : "w-[54%]";
              const heightClass =
                tier === 0 ? "h-11" : tier === 1 ? "h-8" : tier === 2 ? "h-7" : "h-6";
              const textClass =
                tier === 0
                  ? "text-base font-black"
                  : tier === 1
                    ? "text-sm font-bold"
                    : "text-xs font-medium";
              const isShooter = i === 0 && slot && (slot.player.status === "active" || slot.linger);
              const shellClass = slot
                ? isShooter
                  ? "bg-gradient-to-r from-red-600/95 to-red-800/95 shadow-[0_0_16px_rgba(220,38,38,0.5)] border-2 border-red-400"
                  : "bg-black/90 border border-white/15"
                : "border border-dashed border-white/20 bg-black/25";

              return (
                <div
                  key={`slot-${i}`}
                  className={`relative flex items-center justify-between overflow-hidden rounded-lg px-2.5 backdrop-blur-md ${widthClass} ${heightClass} ${shellClass}`}
                >
                  <AnimatePresence mode="wait">
                    {slot && (
                      <motion.div
                        key={slot.player.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex w-full items-center justify-between gap-2"
                      >
                        <span className={`truncate uppercase text-white ${textClass}`}>
                          {slot.player.name}
                        </span>
                        {isShooter && (
                          <span className="text-lg font-black tabular-nums text-white drop-shadow-md">
                            {slot.player.score}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEADERBOARD */}
        <div className="relative mt-2 flex w-[70%] flex-1 flex-col gap-2">
          <div className="px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/90 drop-shadow-md">
              Top 10
            </h2>
          </div>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence>
              {finishedPlayers.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 2.5,
                    ease: [0.16, 1, 0.3, 1],
                    layout: { duration: 2.5, ease: [0.16, 1, 0.3, 1] },
                  }}
                  onDoubleClick={() => handleDeclareWinner(p.id)}
                  className={`absolute left-0 right-0 flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded border-l-4 border-l-amber-500 bg-gradient-to-r from-black/80 to-black/40 p-2 shadow-lg backdrop-blur-sm ${
                    canEdit ? "cursor-pointer" : ""
                  } ${p.isWinner ? "ring-2 ring-amber-400" : ""}`}
                  style={{ top: i * 42 }}
                  title={canEdit ? "Double-click to declare winner" : undefined}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="w-4 shrink-0 text-sm font-black text-amber-500">{i + 1}</span>
                    <span className="truncate text-sm font-bold uppercase text-white">{p.name}</span>
                  </div>
                  <div className="shrink-0 rounded bg-amber-500/20 px-2 text-lg font-black text-amber-400 shadow-inner">
                    {p.score}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col">
        <div className="flex h-12 items-center justify-center border-t-2 border-white/20 bg-gradient-to-r from-[#143A7A] to-[#1A4A9A] px-4 shadow-2xl">
          <h2 className="truncate text-center text-xl font-black uppercase tracking-widest text-white drop-shadow-md">
            {state.title}
          </h2>
        </div>
        <div className="flex h-8 items-center overflow-hidden border-t border-white/10 bg-black">
          <div
            className="shootout-ticker-content text-sm font-bold uppercase tracking-wide text-amber-400"
            style={{ animationDuration: `${ticker1Duration}s` }}
          >
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1}
          </div>
        </div>
        <div className="flex h-8 items-center overflow-hidden border-t border-white/10 bg-[#8F1826]">
          <div
            className="shootout-ticker-content text-xs font-bold uppercase tracking-wide text-white"
            style={{ animationDuration: `${ticker2Duration}s` }}
          >
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismissWinner}
            className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mx-4 rounded-2xl border border-white/20 bg-black/50 px-8 py-10 text-center shadow-2xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-3 text-lg font-bold uppercase tracking-[0.3em] text-amber-400">
                Winner
              </p>
              <p className="text-4xl font-black uppercase tracking-wide text-white drop-shadow-lg">
                {winner.name}
              </p>
              <p className="mt-4 text-2xl font-black text-amber-300">{winner.score} pts</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleDismissWinner}
                  className="mt-6 rounded-lg border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white/80"
                >
                  Dismiss
                </button>
              )}
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes shootout-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .shootout-ticker-content {
            display: inline-block;
            white-space: nowrap;
            animation-name: shootout-scroll;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }
        `,
        }}
      />
    </div>
  );
}
