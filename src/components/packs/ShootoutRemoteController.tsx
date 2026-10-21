"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import LogoSelectionModal, { type Logo } from "@/components/LogoSelectionModal";
import {
  useShootoutMatch,
  normalizeShootoutName,
  queuePlayers,
  clearQueuePatch,
  clearTop10Patch,
  SHOOTOUT_QUEUE_CAP,
  type ShootHistoryRound,
  type ShootoutPlayer,
  type ShootoutState,
} from "@/hooks/useShootoutMatch";
import { downloadShootoutResultsPng } from "@/lib/shootoutResultsPng";
import { listLogos, uploadOverlayLogo } from "@/lib/logos";
import { type PackId } from "@/lib/packs";
import { getFamilyId } from "@/lib/players";
import { supabase } from "@/lib/supabase";

type MediaSlotKey = "logo_1_url" | "logo_2_url" | "logo_3_url" | "sponsor_image_url";

export function ShootoutRemoteController({ packId, matchId }: { packId: PackId; matchId: string }) {
  const { state, canEdit, loading, persist } = useShootoutMatch(matchId);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<MediaSlotKey | null>(null);
  const [pickSlot, setPickSlot] = useState<MediaSlotKey | null>(null);

  const [queueError, setQueueError] = useState<string | null>(null);

  const refreshLogos = useCallback(
    async (fid: string, logoPackId: string) => {
      try {
        let rows = await listLogos(fid, logoPackId);
        // Legacy / mixed packs: show all family logos if this pack library is empty.
        if (rows.length === 0 && supabase) {
          const { data, error } = await supabase
            .from("logos")
            .select("id, family_id, pack_id, name, logo_url, created_at")
            .eq("family_id", fid)
            .order("name", { ascending: true });
          if (error) throw error;
          rows = (data as Awaited<ReturnType<typeof listLogos>>) ?? [];
        }
        setLogos(rows.map((r) => ({ id: r.id, name: r.name, logoURL: r.logo_url })));
      } catch (err) {
        console.error("Failed to load logos", err);
        setMediaError(err instanceof Error ? err.message : "Failed to load logos");
      }
    },
    []
  );

  useEffect(() => {
    if (!supabase || loading) return;
    let cancelled = false;

    void (async () => {
      const { data: match } = await supabase
        .from("matches")
        .select("family_id, pack_id")
        .eq("id", matchId)
        .maybeSingle();

      const { data: shootout } = await supabase
        .from("shootout_matches")
        .select("family_id, pack_id")
        .eq("id", matchId)
        .maybeSingle();

      const profileFamilyId = await getFamilyId();

      if (cancelled) return;

      const fid =
        (match?.family_id as string | null) ||
        (shootout?.family_id as string | null) ||
        profileFamilyId ||
        null;
      const logoPack =
        (match?.pack_id as string | null) ||
        (shootout?.pack_id as string | null) ||
        packId;

      setFamilyId(fid);
      if (fid) await refreshLogos(fid, logoPack);
      else setMediaError("No family linked — sign in with a provisioned account to upload logos.");
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, matchId, packId, refreshLogos]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!canEdit) return <div className="p-8">View only. Not authorized.</div>;

  const handleAddPlayer = (e: FormEvent) => {
    e.preventDefault();
    const name = newPlayerName.trim();
    if (!name) return;
    setQueueError(null);

    const key = normalizeShootoutName(name);
    if (state.players.some((p) => normalizeShootoutName(p.name) === key)) {
      setQueueError("That name is already on the list.");
      return;
    }

    const queued = queuePlayers(state.players).length;
    const queueFull = queued >= SHOOTOUT_QUEUE_CAP;
    const hasActive = state.players.some((p) => p.status === "active");
    const newPlayer: ShootoutPlayer = {
      id: crypto.randomUUID(),
      name,
      score: 0,
      status: queueFull ? "idle" : hasActive ? "waiting" : "active",
    };

    persist({ players: [...state.players, newPlayer] });
    setNewPlayerName("");
  };

  const handleScoreChange = (id: string, delta: number) => {
    const nextPlayers = state.players.map((p) => {
      if (p.id === id) {
        return { ...p, score: Math.max(0, p.score + delta) };
      }
      return p;
    });
    persist({ players: nextPlayers });
  };

  const appendHistoryEntry = (
    history: ShootHistoryRound[],
    player: ShootoutPlayer
  ): ShootHistoryRound[] => {
    const next = history.map((r) => ({ ...r, entries: [...r.entries] }));
    let round = next[next.length - 1];
    if (!round) {
      round = {
        id: crypto.randomUUID(),
        label: "Round 1",
        startedAt: new Date().toISOString(),
        entries: [],
      };
      next.push(round);
    }
    round.entries.push({
      seq: round.entries.length + 1,
      playerId: player.id,
      name: player.name,
      score: player.score,
      finishedAt: new Date().toISOString(),
    });
    return next;
  };

  const handleStatusChange = (id: string, status: ShootoutPlayer["status"]) => {
    setQueueError(null);
    const target = state.players.find((p) => p.id === id);
    if (!target) return;

    if (status === "waiting" || status === "active") {
      const othersInQueue = queuePlayers(state.players).filter((p) => p.id !== id).length;
      if (
        (target.status === "finished" || target.status === "idle") &&
        othersInQueue >= SHOOTOUT_QUEUE_CAP
      ) {
        setQueueError(`Queue is full (${SHOOTOUT_QUEUE_CAP}).`);
        return;
      }
    }

    const nextPlayers: ShootoutPlayer[] = state.players.map((p) => {
      if (p.id === id) return { ...p, status };
      if (status === "active" && p.status === "active") return { ...p, status: "waiting" as const };
      return p;
    });

    let nextHistory = state.shoot_history;

    if (status === "finished") {
      const finishedPlayer = nextPlayers.find((p) => p.id === id);
      if (finishedPlayer) {
        nextHistory = appendHistoryEntry(nextHistory, finishedPlayer);
      }
      const firstWaiting = nextPlayers.find((p) => p.status === "waiting");
      if (firstWaiting) {
        firstWaiting.status = "active";
      }
    }

    persist({ players: nextPlayers, shoot_history: nextHistory });
  };

  const handleEnqueue = (id: string) => {
    setQueueError(null);
    if (queuePlayers(state.players).length >= SHOOTOUT_QUEUE_CAP) {
      setQueueError(`Queue is full (${SHOOTOUT_QUEUE_CAP}).`);
      return;
    }
    const target = state.players.find((p) => p.id === id);
    if (!target) return;
    const hasActive = state.players.some((p) => p.status === "active");
    const rest = state.players.filter((p) => p.id !== id);
    const updated: ShootoutPlayer = {
      ...target,
      status: hasActive ? "waiting" : "active",
      score: 0,
      isWinner: false,
    };
    // Append so Up Next shows them at the bottom of the waiting list.
    persist({ players: [...rest, updated] });
  };

  const handleClearQueue = () => {
    const patch = clearQueuePatch(state);
    if (!patch) return;
    setQueueError(null);
    persist(patch);
  };

  const handleClearTop10 = () => {
    const patch = clearTop10Patch(state);
    if (!patch) return;
    setQueueError(null);
    persist(patch);
  };

  const handleDeletePlayer = (id: string) => {
    persist({ players: state.players.filter((p) => p.id !== id) });
  };

  const handleDownloadPng = () => {
    downloadShootoutResultsPng({
      title: state.title,
      history: state.shoot_history,
      players: state.players,
    });
  };

  const setMediaUrl = (slot: MediaSlotKey, url: string | null) => {
    persist({ [slot]: url } as Partial<ShootoutState>);
  };

  const handleUpload = async (slot: MediaSlotKey, file: File | null) => {
    if (!file) return;
    let fid = familyId;
    if (!fid) {
      fid = await getFamilyId();
      if (fid) setFamilyId(fid);
    }
    if (!fid) {
      setMediaError("No family linked — cannot upload yet. Sign in with a provisioned account.");
      return;
    }
    setMediaError(null);
    setUploadingSlot(slot);
    try {
      const row = await uploadOverlayLogo(file, file.name, packId, fid);
      setMediaUrl(slot, row.logo_url);
      await refreshLogos(fid, packId);
    } catch (err) {
      console.error("Upload failed", err);
      setMediaError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  };

  const activePlayer = state.players.find((p) => p.status === "active");
  const queuedCount = queuePlayers(state.players).length;
  const finishedCount = state.players.filter((p) => p.status === "finished").length;
  const sortedPlayers = [...state.players].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
  const pickTitle =
    pickSlot === "sponsor_image_url"
      ? "Select Sponsor Image"
      : pickSlot === "logo_1_url"
        ? "Select Logo 1"
        : pickSlot === "logo_2_url"
          ? "Select Logo 2"
          : "Select Logo 3";

  return (
    <div className="mx-auto max-w-2xl p-4 pb-[max(5rem,env(safe-area-inset-bottom))]">
      <h1 className="mb-4 text-2xl font-bold">Shootout Controller</h1>

      {/* 1. Live toggles */}
      <section className="mb-4 rounded-xl border p-3 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="flex min-h-12 items-center gap-3 rounded-lg px-1 active:bg-neutral-50">
            <input
              type="checkbox"
              checked={state.is_standby}
              onChange={(e) => persist({ is_standby: e.target.checked })}
              className="h-6 w-6 shrink-0"
            />
            <span className="font-medium">Standby Mode</span>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-lg px-1 active:bg-neutral-50">
            <input
              type="checkbox"
              checked={state.show_sponsor}
              onChange={(e) => persist({ show_sponsor: e.target.checked })}
              className="h-6 w-6 shrink-0"
            />
            <span className="font-medium">Show Sponsor Popup</span>
          </label>
        </div>
      </section>

      {/* 2. Current Shooter — scrolls with page (no sticky) so keyboard doesn’t cover queue */}
      <section className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-md">
        <h2 className="mb-2 text-base font-semibold text-blue-900">Current Shooter</h2>
        {activePlayer ? (
          <div className="flex flex-col gap-3">
            <span className="text-center text-xl font-bold sm:text-left">{activePlayer.name}</span>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => handleScoreChange(activePlayer.id, -1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10 text-2xl font-bold active:bg-black/20"
              >
                −
              </button>
              <span className="min-w-[3ch] text-center text-5xl font-black tabular-nums">
                {activePlayer.score}
              </span>
              <button
                type="button"
                onClick={() => handleScoreChange(activePlayer.id, 1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white shadow-md active:bg-blue-700"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleStatusChange(activePlayer.id, "finished")}
              className="min-h-11 w-full rounded-xl bg-red-600 text-lg font-bold text-white shadow-md active:bg-red-700"
            >
              End Turn
            </button>
          </div>
        ) : (
          <p className="text-neutral-500">No active shooter. Set a player to active below.</p>
        )}
      </section>

      {/* 3. Roster (A–Z) */}
      <section className="mb-6 rounded-xl border p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Players{" "}
            <span className="text-sm font-normal text-neutral-500">
              (queue {queuedCount}/{SHOOTOUT_QUEUE_CAP} · A–Z)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleClearQueue}
              disabled={queuedCount === 0}
              className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-40 active:bg-amber-100"
            >
              Clear Queue
            </button>
            <button
              type="button"
              onClick={handleClearTop10}
              disabled={finishedCount === 0}
              className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-40 active:bg-amber-100"
            >
              Clear Top 10
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white active:bg-slate-800"
            >
              Download PNG
            </button>
          </div>
        </div>

        {queueError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{queueError}</p>
        )}

        <form onSubmit={handleAddPlayer} className="mb-4 flex gap-2">
          <input
            className="min-h-12 flex-1 rounded-lg border px-3 text-base"
            placeholder="New player name..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded-lg bg-black px-5 font-bold text-white active:bg-neutral-800"
          >
            Add
          </button>
        </form>
        {queuedCount >= SHOOTOUT_QUEUE_CAP && (
          <p className="mb-3 text-xs text-neutral-500">
            Queue is full — new names are saved as Available (idle) for later.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
                  {p.score} pts
                </span>
                {p.isWinner && (
                  <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                    Winner
                  </span>
                )}
                {p.status === "idle" && (
                  <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                    Available
                  </span>
                )}
                {p.status === "finished" && (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                    Finished
                  </span>
                )}
                {p.status === "active" && (
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                    Active
                  </span>
                )}
                {p.status === "waiting" && (
                  <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
                    Waiting
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(p.status === "finished" || p.status === "idle") && (
                  <button
                    type="button"
                    onClick={() => handleEnqueue(p.id)}
                    className="min-h-11 flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-900 active:bg-blue-100"
                  >
                    {p.status === "idle" ? "Add to queue" : "Re-queue"}
                  </button>
                )}
                {p.status === "waiting" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(p.id, "active")}
                    className="min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium active:bg-neutral-50"
                  >
                    Set Active
                  </button>
                )}
                {p.status === "active" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(p.id, "waiting")}
                    className="min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium active:bg-neutral-50"
                  >
                    Set Wait
                  </button>
                )}
                {(p.status === "active" || p.status === "waiting") && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(p.id, "idle")}
                    className="min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium active:bg-neutral-50"
                  >
                    Remove from queue
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePlayer(p.id)}
                  className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 active:bg-red-50"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
          {state.players.length === 0 && (
            <p className="text-sm text-neutral-500">No players added yet.</p>
          )}
        </div>
      </section>

      {/* 4. Text & Media — setup, less urgent mid-shot */}
      <section className="mb-8 rounded-xl border p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Text & Media</h2>
        {mediaError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mediaError}</p>
        )}
        <div className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Event Title
            <input
              className="min-h-11 rounded border px-3 text-base font-normal"
              value={state.title}
              onChange={(e) => persist({ title: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Ticker Line 1
            <textarea
              className="min-h-[6rem] rounded border px-3 py-2 text-base font-normal leading-relaxed whitespace-pre-wrap"
              rows={4}
              value={state.ticker_1}
              onChange={(e) => persist({ ticker_1: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Ticker Line 2
            <textarea
              className="min-h-[6rem] rounded border px-3 py-2 text-base font-normal leading-relaxed whitespace-pre-wrap"
              rows={4}
              value={state.ticker_2}
              onChange={(e) => persist({ ticker_2: e.target.value })}
            />
          </label>

          <MediaSlotRow
            label="Sponsor banner"
            url={state.sponsor_image_url}
            wide
            busy={uploadingSlot === "sponsor_image_url"}
            onPick={() => setPickSlot("sponsor_image_url")}
            onUpload={(file) => void handleUpload("sponsor_image_url", file)}
            onClear={() => setMediaUrl("sponsor_image_url", null)}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <MediaSlotRow
              label="Logo 1"
              url={state.logo_1_url}
              busy={uploadingSlot === "logo_1_url"}
              onPick={() => setPickSlot("logo_1_url")}
              onUpload={(file) => void handleUpload("logo_1_url", file)}
              onClear={() => setMediaUrl("logo_1_url", null)}
            />
            <MediaSlotRow
              label="Logo 2"
              url={state.logo_2_url}
              busy={uploadingSlot === "logo_2_url"}
              onPick={() => setPickSlot("logo_2_url")}
              onUpload={(file) => void handleUpload("logo_2_url", file)}
              onClear={() => setMediaUrl("logo_2_url", null)}
            />
            <MediaSlotRow
              label="Logo 3"
              url={state.logo_3_url}
              busy={uploadingSlot === "logo_3_url"}
              onPick={() => setPickSlot("logo_3_url")}
              onUpload={(file) => void handleUpload("logo_3_url", file)}
              onClear={() => setMediaUrl("logo_3_url", null)}
            />
          </div>
          <p className="text-xs text-neutral-500">
            Upload adds to your pack logo library. Pick reuses anything already uploaded.
          </p>
        </div>
      </section>

      <LogoSelectionModal
        isOpen={Boolean(pickSlot)}
        onClose={() => setPickSlot(null)}
        logos={logos}
        selectedLogoURL={pickSlot ? state[pickSlot] : null}
        title={pickTitle}
        onSelect={(logo) => {
          if (!pickSlot) return;
          setMediaUrl(pickSlot, logo.logoURL);
          setPickSlot(null);
        }}
      />
    </div>
  );
}

function MediaSlotRow({
  label,
  url,
  wide,
  busy,
  onPick,
  onUpload,
  onClear,
}: {
  label: string;
  url: string | null;
  wide?: boolean;
  busy: boolean;
  onPick: () => void;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div
          className={`relative shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 ${
            wide ? "h-16 w-28" : "h-14 w-14"
          }`}
        >
          {url ? (
            <Image src={url} alt={label} fill className="object-contain" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
              Empty
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPick}
            className="min-h-11 rounded-lg border px-3 text-sm font-medium active:bg-neutral-50"
          >
            Pick
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-lg border bg-neutral-900 px-3 text-sm font-medium text-white active:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          {url && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 active:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            onUpload(file);
          }}
        />
      </div>
    </div>
  );
}
