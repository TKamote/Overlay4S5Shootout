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

export default function ShootoutLandscape({ matchId }: { matchId: string }) {
  const { state, loading, canEdit, persist } = useShootoutMatch(matchId);

  if (loading) return null;

  if (state.is_standby) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
        <h1 className="mb-6 text-center text-6xl font-black uppercase tracking-widest text-white drop-shadow-lg">
          {state.title}
        </h1>
        <p className="animate-pulse text-3xl font-bold text-neutral-300">
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
      {/* --- TOP SPONSOR --- */}
      <AnimatePresence>
        {state.show_sponsor && state.sponsor_image_url && (
          <div className="pointer-events-none absolute left-1/2 top-8 z-40 -translate-x-1/2">
            <motion.div
              initial={{ y: -200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -200, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="relative overflow-hidden rounded-xl border-2 border-white/20 bg-black shadow-2xl"
              style={{ width: 200, aspectRatio: "16/9" }}
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

      {/* --- LEFT COLUMN: Logos + Leaderboard --- */}
      <div className="absolute bottom-32 left-[3%] top-8 z-10 flex w-80 flex-col gap-6">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-4 shadow-lg backdrop-blur-sm">
          {[state.logo_1_url, state.logo_2_url, state.logo_3_url].map((url, i) => (
            <div
              key={i}
              className="relative h-[104px] w-[104px] overflow-hidden rounded-full border border-white/20 bg-white/5"
            >
              {url && (
                <Image src={url} alt={`Logo ${i + 1}`} fill className="object-cover" unoptimized />
              )}
            </div>
          ))}
        </div>

        <div className="flex w-[70%] flex-1 flex-col gap-3">
          <div className="px-2">
            <h2 className="text-xl font-black uppercase tracking-widest text-white/90 drop-shadow-md">
              Top 10 Leaders
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
                  className={`absolute left-0 right-0 flex min-w-0 cursor-default items-center justify-between gap-2 overflow-hidden rounded-lg border-l-4 border-l-amber-500 bg-gradient-to-r from-black/80 to-black/40 p-3 shadow-lg backdrop-blur-sm ${
                    canEdit ? "cursor-pointer" : ""
                  } ${p.isWinner ? "ring-2 ring-amber-400" : ""}`}
                  style={{ top: i * 68 }}
                  title={canEdit ? "Double-click to declare winner" : undefined}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="w-6 shrink-0 text-xl font-black text-amber-500">{i + 1}</span>
                    <span className="truncate text-xl font-bold uppercase text-white">{p.name}</span>
                  </div>
                  <div className="shrink-0 rounded bg-amber-500/20 px-3 py-1 text-2xl font-black text-amber-400 shadow-inner">
                    {p.score}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: 13-slot Up Next --- */}
      <div className="absolute bottom-32 right-[3%] top-8 z-10 flex w-[280px] flex-col items-end gap-2">
        <h2 className="text-xl font-black uppercase tracking-widest text-white/90 drop-shadow-md">
          Up Next
        </h2>
        <div className="flex w-full flex-col items-end gap-1.5">
          {slots.map((slot, i) => {
            const tier = Math.min(i, 3);
            const widthClass =
              tier === 0 ? "w-[78%]" : tier === 1 ? "w-[70%]" : tier === 2 ? "w-[62%]" : "w-[54%]";
            const heightClass =
              tier === 0 ? "h-14" : tier === 1 ? "h-11" : tier === 2 ? "h-9" : "h-8";
            const textClass =
              tier === 0
                ? "text-xl font-black"
                : tier === 1
                  ? "text-lg font-bold"
                  : tier === 2
                    ? "text-base font-semibold"
                    : "text-sm font-medium";
            const isShooter = i === 0 && slot && (slot.player.status === "active" || slot.linger);
            const shellClass = slot
              ? isShooter
                ? "bg-gradient-to-r from-red-600/95 to-red-800/95 shadow-[0_0_20px_rgba(220,38,38,0.5)] border-2 border-red-400"
                : "bg-black/90 border border-white/15"
              : "border border-dashed border-white/20 bg-black/25";

            return (
              <div
                key={`slot-${i}`}
                className={`relative flex items-center justify-between overflow-hidden rounded-xl px-3 backdrop-blur-md ${widthClass} ${heightClass} ${shellClass}`}
              >
                <AnimatePresence mode="wait">
                  {slot && (
                    <motion.div
                      key={slot.player.id}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <span className={`truncate uppercase text-white ${textClass}`}>
                        {slot.player.name}
                      </span>
                      {isShooter && (
                        <span className="text-2xl font-black tabular-nums text-white drop-shadow-md">
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

      {/* --- BOTTOM: L-Bar & Ticker --- */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col">
        <div className="flex h-14 items-center justify-center border-t-2 border-white/20 bg-gradient-to-r from-[#143A7A] to-[#1A4A9A] px-8 shadow-2xl">
          <h2 className="text-center text-3xl font-black uppercase tracking-widest text-white drop-shadow-md">
            {state.title}
          </h2>
        </div>
        <div className="flex h-10 items-center overflow-hidden border-t border-white/10 bg-black">
          <div
            className="shootout-ticker-content text-xl font-bold uppercase tracking-wide text-amber-400"
            style={{ animationDuration: `${ticker1Duration}s` }}
          >
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker1} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker1}
          </div>
        </div>
        <div className="flex h-10 items-center overflow-hidden border-t border-white/10 bg-[#8F1826]">
          <div
            className="shootout-ticker-content text-lg font-bold uppercase tracking-wide text-white"
            style={{ animationDuration: `${ticker2Duration}s` }}
          >
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp;{" "}
            {ticker2} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker2}
          </div>
        </div>
      </div>

      {/* Winner modal — ~50% transparent */}
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
              className="rounded-2xl border border-white/20 bg-black/50 px-16 py-12 text-center shadow-2xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-4 text-2xl font-bold uppercase tracking-[0.3em] text-amber-400">
                Winner
              </p>
              <p className="text-6xl font-black uppercase tracking-wide text-white drop-shadow-lg">
                {winner.name}
              </p>
              <p className="mt-6 text-3xl font-black text-amber-300">{winner.score} pts</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleDismissWinner}
                  className="mt-8 rounded-lg border border-white/30 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white/80 hover:bg-white/10"
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
