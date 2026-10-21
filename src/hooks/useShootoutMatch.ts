"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type ShootoutPlayerStatus = "idle" | "waiting" | "active" | "finished";

export interface ShootoutPlayer {
  id: string;
  name: string;
  photoUrl?: string;
  score: number;
  status: ShootoutPlayerStatus;
  isWinner?: boolean;
}

export type ShootHistoryEntry = {
  seq: number;
  playerId: string;
  name: string;
  score: number;
  finishedAt: string;
};

export type ShootHistoryRound = {
  id: string;
  label: string;
  startedAt: string;
  entries: ShootHistoryEntry[];
};

export interface ShootoutState {
  id: string;
  title: string;
  ticker_1: string;
  ticker_2: string;
  logo_1_url: string | null;
  logo_2_url: string | null;
  logo_3_url: string | null;
  sponsor_image_url: string | null;
  show_sponsor: boolean;
  is_standby: boolean;
  players: ShootoutPlayer[];
  shoot_history: ShootHistoryRound[];
}

/** Max names in Up Next UI: 1 active + 12 waiting. */
export const SHOOTOUT_QUEUE_CAP = 13;

export function normalizeShootoutName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function queuePlayers(players: ShootoutPlayer[]): ShootoutPlayer[] {
  return players.filter((p) => p.status === "active" || p.status === "waiting");
}

export function hasShootoutWinner(players: ShootoutPlayer[]): boolean {
  return players.some((p) => p.isWinner);
}

export function clearWinnerFlags(players: ShootoutPlayer[]): ShootoutPlayer[] {
  return players.map((p) => ({ ...p, isWinner: false }));
}

/** Last finished shooter for linger UI when queue has no active. */
export function lingeringShooter(state: ShootoutState): ShootoutPlayer | undefined {
  if (state.players.some((p) => p.status === "active")) return undefined;
  for (let r = state.shoot_history.length - 1; r >= 0; r--) {
    const entries = state.shoot_history[r]?.entries;
    if (!entries?.length) continue;
    const last = entries[entries.length - 1];
    const player = state.players.find((p) => p.id === last.playerId && p.status === "finished");
    if (player) return player;
  }
  const finished = state.players.filter((p) => p.status === "finished");
  return finished[finished.length - 1];
}

/** Park active+waiting as idle (keep roster). Mistake fix — no history mutation. */
export function clearQueuePatch(state: ShootoutState): Partial<ShootoutState> | null {
  if (queuePlayers(state.players).length === 0) return null;

  const players = state.players.map((p) =>
    p.status === "active" || p.status === "waiting"
      ? { ...p, status: "idle" as const, score: 0 }
      : p
  );
  return { players };
}

/** Park finished leaders as idle; clear winner flags. History stays append-only. */
export function clearTop10Patch(state: ShootoutState): Partial<ShootoutState> | null {
  const hasFinished = state.players.some((p) => p.status === "finished");
  if (!hasFinished) return null;

  const players = state.players.map((p) =>
    p.status === "finished"
      ? { ...p, status: "idle" as const, score: 0, isWinner: false }
      : p
  );
  return { players };
}

/** Single-line ticker copy for overlay marquee (newlines → spaces). */
export function flattenTickerText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Marquee duration so longer copy keeps ~same pace as 25s / ~10 words. */
export function tickerScrollDurationSec(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 1;
  const BASE_WORDS = 10;
  const BASE_SEC = 25;
  return Math.max(BASE_SEC, (words / BASE_WORDS) * BASE_SEC);
}

export function declareWinnerPatch(
  players: ShootoutPlayer[],
  winnerId: string
): ShootoutPlayer[] {
  return players.map((p) => ({ ...p, isWinner: p.id === winnerId }));
}

function rowToState(match: Record<string, unknown>, matchId: string): ShootoutState {
  return {
    id: (match.id as string) || matchId,
    title: (match.title as string) || DEFAULT_STATE.title,
    ticker_1: (match.ticker_1 as string) || DEFAULT_STATE.ticker_1,
    ticker_2: (match.ticker_2 as string) || DEFAULT_STATE.ticker_2,
    logo_1_url: (match.logo_1_url as string | null) ?? null,
    logo_2_url: (match.logo_2_url as string | null) ?? null,
    logo_3_url: (match.logo_3_url as string | null) ?? null,
    sponsor_image_url: (match.sponsor_image_url as string | null) ?? null,
    show_sponsor: Boolean(match.show_sponsor),
    is_standby: match.is_standby !== false,
    players: (match.players as ShootoutPlayer[]) || [],
    shoot_history: (match.shoot_history as ShootHistoryRound[]) || [],
  };
}

const DEFAULT_STATE: ShootoutState = {
  id: "",
  title: "SHOOTOUT TOURNAMENT",
  ticker_1: "Welcome to the Live Stream",
  ticker_2: "Follow us on social media",
  logo_1_url: null,
  logo_2_url: null,
  logo_3_url: null,
  sponsor_image_url: null,
  show_sponsor: false,
  is_standby: true,
  players: [],
  shoot_history: [],
};

export function useShootoutMatch(matchId: string) {
  const { isSignedIn, ready: authReady } = useAuth();
  const cloud = Boolean(supabase);

  const [state, setState] = useState<ShootoutState>({ ...DEFAULT_STATE, id: matchId });
  const [loading, setLoading] = useState(cloud);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const familyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEditToken(new URLSearchParams(window.location.search).get("edit"));
    }
  }, []);

  useEffect(() => {
    if (!supabase || !editToken || !matchId) {
      setTokenValid(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc("verify_match_edit_token", {
        p_match_id: matchId,
        p_token: editToken,
      });
      if (!cancelled) setTokenValid(!error && Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [editToken, matchId]);

  const canEdit = cloud ? isSignedIn || tokenValid : true;

  const persist = useCallback(
    async (patch: Partial<ShootoutState>) => {
      if (!canEdit || !supabase) return;

      setState((prev) => ({ ...prev, ...patch }));

      const clean = { ...patch };
      delete clean.id;

      if (isSignedIn) {
        const { error } = await supabase.from("shootout_matches").update(clean).eq("id", matchId);
        if (error) console.error("shootout update failed", error);
        return;
      }

      if (tokenValid && editToken) {
        const { error } = await supabase.rpc("update_shootout_match_with_token", {
          p_match_id: matchId,
          p_token: editToken,
          p_patch: clean,
        });
        if (error) console.error("shootout token update failed", error);
      }
    },
    [canEdit, editToken, isSignedIn, matchId, tokenValid]
  );

  useEffect(() => {
    if (!supabase || !authReady) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let cancelled = false;

    const load = async () => {
      try {
        let { data: match } = await client
          .from("shootout_matches")
          .select("*")
          .eq("id", matchId)
          .maybeSingle();

        if (!match) {
          const { data: baseMatch } = await client
            .from("matches")
            .select("family_id, pack_id")
            .eq("id", matchId)
            .maybeSingle();

          if (isSignedIn && baseMatch?.family_id) {
            const { data: created, error: insertError } = await client
              .from("shootout_matches")
              .insert({
                id: matchId,
                family_id: baseMatch.family_id,
                pack_id: baseMatch.pack_id,
              })
              .select("*")
              .maybeSingle();
            if (insertError) {
              console.error("shootout bootstrap insert failed", insertError);
            } else {
              match = created;
            }
          } else if (editToken) {
            await client.rpc("update_shootout_match_with_token", {
              p_match_id: matchId,
              p_token: editToken,
              p_patch: {},
            });
            const { data: afterToken } = await client
              .from("shootout_matches")
              .select("*")
              .eq("id", matchId)
              .maybeSingle();
            match = afterToken;
          }
        }

        if (cancelled) return;

        if (match) {
          familyIdRef.current = match.family_id as string | null;
          setState(rowToState(match as Record<string, unknown>, matchId));
        }
      } catch (err) {
        console.error("Failed to load shootout match", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const channel = client
      .channel(`shootout_matches:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shootout_matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (row?.id) {
            setState(rowToState(row, matchId));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [authReady, editToken, isSignedIn, matchId]);

  return {
    state,
    canEdit,
    loading,
    persist,
    editToken: tokenValid ? editToken : null,
  };
}
