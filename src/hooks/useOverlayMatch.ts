"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  isLaptopRaceDec,
  isLaptopRaceInc,
  isNumpadPlayer1Dec,
  isNumpadPlayer1Inc,
} from "@/lib/overlayKeyboard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { persistMatchPatch, persistMatchPatchOnPack } from "@/lib/matchPersist";
import { DEFAULT_BALL_STYLE, parseBallStyle, type BallStyleId } from "@/lib/ballStyles";
import {
  DEFAULT_TOURNAMENT_TITLE_DISPLAY,
  TOURNAMENT_TITLE_MAX_LEN,
} from "@/components/TournamentTitleBanner";
import { RUNNING_SUBTITLE_MAX_LEN } from "@/components/RunningSubtitleTicker";

export const DEFAULT_PLAYER1_NAME = "Player A";
export const DEFAULT_PLAYER2_NAME = "Player B";

export type GameMode = "9-ball" | "10-ball" | "8-ball" | "15-ball";
export type RackStyle = "full" | "icons";

export interface OverlayPlayer {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

const DEMO_PLAYERS: OverlayPlayer[] = [
  { id: "demo-1", name: "Alex Rivera", points: 120 },
  { id: "demo-2", name: "Jordan Lee", points: 105 },
  { id: "demo-3", name: "Sam Torres", points: 98 },
  { id: "demo-4", name: "Chris Park", points: 87 },
];

type MatchRow = {
  id: string;
  family_id: string | null;
  pack_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  race_to: number;
  pocketed_balls: number[] | null;
  game_mode: string | null;
  is_standby?: boolean | null;
  scoreboard_hidden?: boolean | null;
  ball_style?: string | null;
  tournament_title?: string | null;
  running_subtitle?: string | null;
};

type BootstrapPayload = {
  match: MatchRow;
  players: PlayerRow[] | null;
};

type PlayerRow = {
  id: string;
  name: string;
  photo_url: string | null;
  points: number | null;
};

const toOverlayPlayer = (row: PlayerRow): OverlayPlayer => ({
  id: row.id,
  name: row.name,
  photoURL: row.photo_url || undefined,
  points: row.points ?? 0,
});

function parseTournamentTitle(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().slice(0, TOURNAMENT_TITLE_MAX_LEN);
  return trimmed || DEFAULT_TOURNAMENT_TITLE_DISPLAY;
}

function parseRunningSubtitle(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, RUNNING_SUBTITLE_MAX_LEN);
}

function parseGameMode(value: string | null | undefined, fallback: GameMode): GameMode {
  if (value === "9-ball" || value === "10-ball" || value === "8-ball" || value === "15-ball") {
    return value;
  }
  return fallback;
}

export function getRackBalls(mode: GameMode, style: RackStyle = "full"): number[] {
  switch (mode) {
    case "9-ball":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9];
    case "10-ball":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    case "8-ball":
      return [];
    case "15-ball":
      return style === "full"
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        : [];
    default:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }
}

export function placeholderFor(
  player: OverlayPlayer | null,
  side: "player1" | "player2"
): string {
  if (player?.id) {
    const hash = player.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return `/avatar-placeholder-${(hash % 6) + 1}.svg`;
  }
  return side === "player1" ? "/avatar-placeholder-1.svg" : "/avatar-placeholder-yellow.svg";
}

function readEditTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("edit");
}

export type UseOverlayMatchOptions = {
  matchId: string;
  enableBalls?: boolean;
  rackStyle?: RackStyle;
  defaultRaceTo?: number;
  defaultGameMode?: GameMode;
  /** When false, skip desktop keyboard shortcuts (phone controller). Default true. */
  enableKeyboard?: boolean;
};

/** Match state: local until Supabase is configured, then Realtime + Auth / edit token. */
export function useOverlayMatch({
  matchId,
  enableBalls = false,
  rackStyle = "full",
  defaultRaceTo = 10,
  defaultGameMode = "9-ball",
  enableKeyboard = true,
}: UseOverlayMatchOptions) {
  const { isSignedIn, ready: authReady } = useAuth();
  const cloud = Boolean(supabase);

  const [players, setPlayers] = useState<OverlayPlayer[]>(cloud ? [] : DEMO_PLAYERS);
  const [player1, setPlayer1] = useState<OverlayPlayer | null>(null);
  const [player2, setPlayer2] = useState<OverlayPlayer | null>(null);
  const [player1Score, setPlayer1ScoreState] = useState(0);
  const [player2Score, setPlayer2ScoreState] = useState(0);
  const [raceTo, setRaceToState] = useState(defaultRaceTo);
  const [showRaceToInput, setShowRaceToInput] = useState(false);
  const [tempRaceTo, setTempRaceTo] = useState(String(defaultRaceTo));
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<OverlayPlayer | null>(null);
  const [showPlayer1Modal, setShowPlayer1Modal] = useState(false);
  const [showPlayer2Modal, setShowPlayer2Modal] = useState(false);
  const [pocketedBalls, setPocketedBallsState] = useState<Set<number>>(new Set());
  const [gameMode, setGameModeState] = useState<GameMode>(defaultGameMode);
  const [isStandby, setIsStandbyState] = useState(false);
  const [scoreboardHidden, setScoreboardHiddenState] = useState(false);
  const [ballStyle, setBallStyleState] = useState<BallStyleId>(DEFAULT_BALL_STYLE);
  const [tournamentTitle, setTournamentTitleState] = useState(DEFAULT_TOURNAMENT_TITLE_DISPLAY);
  const [runningSubtitle, setRunningSubtitleState] = useState("");
  const [loading, setLoading] = useState(cloud);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const lastResetPress = useRef(0);
  const RESET_TIMEOUT = 500;
  const playerListRef = useRef<OverlayPlayer[]>([]);
  const familyIdRef = useRef<string | null>(null);
  const packIdRef = useRef<string | null>(null);

  useEffect(() => {
    setEditToken(readEditTokenFromUrl());
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
  const rackBalls = useMemo(
    () => (enableBalls ? getRackBalls(gameMode, rackStyle) : []),
    [enableBalls, gameMode, rackStyle]
  );

  const getPlayer1Name = () => player1?.name || DEFAULT_PLAYER1_NAME;
  const getPlayer2Name = () => player2?.name || DEFAULT_PLAYER2_NAME;
  const getPlayer1Photo = () => player1?.photoURL || null;
  const getPlayer2Photo = () => player2?.photoURL || null;

  const applyMatch = useCallback(
    (row: MatchRow, roster: OverlayPlayer[]) => {
      setPlayer1ScoreState(row.player1_score);
      setPlayer2ScoreState(row.player2_score);
      setRaceToState(row.race_to);
      setTempRaceTo(String(row.race_to));
      setPocketedBallsState(new Set(row.pocketed_balls ?? []));
      setGameModeState(parseGameMode(row.game_mode, defaultGameMode));
      setIsStandbyState(Boolean(row.is_standby));
      setScoreboardHiddenState(Boolean(row.scoreboard_hidden));
      setBallStyleState(parseBallStyle(row.ball_style));
      setTournamentTitleState(parseTournamentTitle(row.tournament_title));
      setRunningSubtitleState(parseRunningSubtitle(row.running_subtitle));
      setPlayer1(roster.find((p) => p.id === row.player1_id) || null);
      setPlayer2(roster.find((p) => p.id === row.player2_id) || null);
    },
    [defaultGameMode]
  );

  const persist = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!canEdit) return;
      await persistMatchPatch(matchId, patch, {
        isSignedIn,
        editToken: tokenValid ? editToken : null,
      });
    },
    [canEdit, editToken, isSignedIn, matchId, tokenValid]
  );

  /** Write pack-wide so landscape and vertical OBS stay in sync. */
  const persistPack = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!canEdit) return;
      await persistMatchPatchOnPack(
        matchId,
        packIdRef.current,
        familyIdRef.current,
        patch,
        {
          isSignedIn,
          editToken: tokenValid ? editToken : null,
        }
      );
    },
    [canEdit, editToken, isSignedIn, matchId, tokenValid]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    if (!authReady) return;

    let cancelled = false;

    const applyRoster = (playerRows: PlayerRow[] | null, fallbackDemo: boolean) => {
      const roster = playerRows?.map(toOverlayPlayer) ?? [];
      playerListRef.current = roster;
      setPlayers(roster.length ? roster : fallbackDemo ? DEMO_PLAYERS : []);
      return roster;
    };

    const loadPlayersForPack = async (familyId: string, packId: string) => {
      const { data } = await client
        .from("players")
        .select("id, name, photo_url, points")
        .eq("family_id", familyId)
        .eq("pack_id", packId);
      return applyRoster(data as PlayerRow[] | null, false);
    };

    const load = async () => {
      try {
        const { data: boot, error: bootError } = await client.rpc("get_overlay_bootstrap", {
          p_match_id: matchId,
        });
        if (!bootError && boot && typeof boot === "object" && "match" in (boot as object)) {
          const payload = boot as BootstrapPayload;
          const match = payload.match;
          familyIdRef.current = match.family_id;
          packIdRef.current = match.pack_id;
          const roster = applyRoster(payload.players, false);
          if (cancelled) return;
          applyMatch(match, roster);
          return;
        }

        const { data: match } = await client.from("matches").select("*").eq("id", matchId).maybeSingle();
        if (cancelled) return;
        if (!match) {
          applyRoster([], true);
          return;
        }
        const row = match as MatchRow;
        familyIdRef.current = row.family_id;
        packIdRef.current = row.pack_id;
        const roster =
          row.family_id && row.pack_id
            ? await loadPlayersForPack(row.family_id, row.pack_id)
            : applyRoster([], false);
        if (cancelled) return;
        applyMatch(row, roster);
      } catch (err) {
        console.error("Failed to load match from Supabase", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const matchChannel = client
      .channel(`match:${matchId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as MatchRow | undefined;
          if (row?.id) applyMatch(row, playerListRef.current);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          const familyId = familyIdRef.current;
          const packId = packIdRef.current;
          if (!familyId || !packId) return;
          void loadPlayersForPack(familyId, packId);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(matchChannel);
    };
  }, [applyMatch, authReady, matchId]);

  const setPlayer1Score = useCallback(
    (value: number | ((prev: number) => number)) => {
      setPlayer1ScoreState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        void persist({ player1_score: next });
        return next;
      });
    },
    [persist]
  );

  const setPlayer2Score = useCallback(
    (value: number | ((prev: number) => number)) => {
      setPlayer2ScoreState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        void persist({ player2_score: next });
        return next;
      });
    },
    [persist]
  );

  const setRaceTo = useCallback(
    (value: number | ((prev: number) => number)) => {
      setRaceToState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        void persist({ race_to: next });
        return next;
      });
    },
    [persist]
  );

  const setIsStandby = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsStandbyState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        void persist({ is_standby: next });
        return next;
      });
    },
    [persist]
  );

  const setScoreboardHidden = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setScoreboardHiddenState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        void persistPack({ scoreboard_hidden: next });
        return next;
      });
    },
    [persistPack]
  );

  /** Persist tournament title; blank falls back to the default display string. */
  const saveTournamentTitle = useCallback(
    (next: string) => {
      const trimmed = parseTournamentTitle(next);
      setTournamentTitleState(trimmed);
      void persist({ tournament_title: trimmed });
    },
    [persist]
  );

  /** Persist running subtitle; blank hides the OBS ticker. */
  const saveRunningSubtitle = useCallback(
    (next: string) => {
      const trimmed = parseRunningSubtitle(next);
      setRunningSubtitleState(trimmed);
      void persist({ running_subtitle: trimmed });
    },
    [persist]
  );

  const handleRaceToChange = () => {
    const next = parseInt(tempRaceTo, 10);
    if (!isNaN(next) && next > 0 && next <= 50) {
      setRaceTo(next);
      setShowRaceToInput(false);
    }
  };

  const handlePlayer1Select = (selectedPlayer: OverlayPlayer) => {
    setPlayer1(selectedPlayer);
    setShowPlayer1Modal(false);
    void persist({ player1_id: selectedPlayer.id });
  };

  const handlePlayer2Select = (selectedPlayer: OverlayPlayer) => {
    setPlayer2(selectedPlayer);
    setShowPlayer2Modal(false);
    void persist({ player2_id: selectedPlayer.id });
  };

  const handleBallClick = useCallback(
    (ballNumber: number) => {
      if (!enableBalls || !canEdit || rackBalls.length === 0) return;
      setPocketedBallsState((prev) => {
        const next = new Set(prev);
        if (next.has(ballNumber)) next.delete(ballNumber);
        else next.add(ballNumber);
        void persist({ pocketed_balls: Array.from(next) });
        return next;
      });
    },
    [canEdit, enableBalls, persist, rackBalls.length]
  );

  const handleResetBalls = useCallback(() => {
    if (!enableBalls || !canEdit || rackBalls.length === 0) return;
    setPocketedBallsState(new Set());
    void persist({ pocketed_balls: [] });
  }, [canEdit, enableBalls, persist, rackBalls.length]);

  const handleWinnerModalClose = useCallback(() => {
    setShowWinnerModal(false);
    setWinner(null);
    setPlayer1Score(0);
    setPlayer2Score(0);
    if (enableBalls && rackBalls.length > 0) handleResetBalls();
  }, [enableBalls, handleResetBalls, rackBalls.length, setPlayer1Score, setPlayer2Score]);

  useEffect(() => {
    if (loading || showWinnerModal) return;
    if (player1Score >= raceTo && player1) {
      setWinner(player1);
      setShowWinnerModal(true);
    } else if (player2Score >= raceTo && player2) {
      setWinner(player2);
      setShowWinnerModal(true);
    }
  }, [player1Score, player2Score, raceTo, player1, player2, loading, showWinnerModal]);

  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!canEdit) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (enableBalls && rackBalls.length > 0) {
        const isDeleteKey =
          e.key === "Delete" ||
          e.key === "Del" ||
          e.keyCode === 46 ||
          (e.key === "Backspace" && !(e.target instanceof HTMLInputElement));
        if (isDeleteKey) {
          e.preventDefault();
          if (showWinnerModal) handleWinnerModalClose();
          else handleResetBalls();
          return;
        }
      }

      if (isNumpadPlayer1Inc(e)) {
        e.preventDefault();
        setPlayer1Score((prev) => prev + 1);
        return;
      }
      if (isNumpadPlayer1Dec(e)) {
        e.preventDefault();
        setPlayer1Score((prev) => Math.max(0, prev - 1));
        return;
      }
      if (e.key === "*" || e.key === "Multiply") {
        e.preventDefault();
        setPlayer2Score((prev) => prev + 1);
        return;
      }
      if (e.key === "/" || e.key === "Divide") {
        e.preventDefault();
        setPlayer2Score((prev) => Math.max(0, prev - 1));
        return;
      }
      if (isLaptopRaceInc(e)) {
        e.preventDefault();
        setRaceTo((prev) => {
          const next = Math.min(50, prev + 1);
          setTempRaceTo(String(next));
          return next;
        });
        return;
      }
      if (isLaptopRaceDec(e)) {
        e.preventDefault();
        setRaceTo((prev) => {
          const next = Math.max(1, prev - 1);
          setTempRaceTo(String(next));
          return next;
        });
        return;
      }

      if (enableBalls && rackBalls.length > 0 && e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        const ballNumber = e.key === "0" ? 10 : parseInt(e.key, 10);
        if (rackBalls.includes(ballNumber)) handleBallClick(ballNumber);
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        case "q":
          setPlayer1Score((prev) => prev + 1);
          break;
        case "a":
          setPlayer1Score((prev) => Math.max(0, prev - 1));
          break;
        case "e":
          setPlayer2Score((prev) => prev + 1);
          break;
        case "d":
          setPlayer2Score((prev) => Math.max(0, prev - 1));
          break;
        case "r": {
          e.preventDefault();
          const now = Date.now();
          if (now - lastResetPress.current < RESET_TIMEOUT) {
            setPlayer1Score(0);
            setPlayer2Score(0);
            if (enableBalls && rackBalls.length > 0) handleResetBalls();
            lastResetPress.current = 0;
          } else {
            lastResetPress.current = now;
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    canEdit,
    enableBalls,
    enableKeyboard,
    showWinnerModal,
    handleWinnerModalClose,
    handleResetBalls,
    handleBallClick,
    rackBalls,
    setPlayer1Score,
    setPlayer2Score,
    setRaceTo,
  ]);

  return {
    isManager: canEdit,
    canEdit,
    editToken: tokenValid ? editToken : null,
    players,
    player1,
    player2,
    player1Score,
    player2Score,
    setPlayer1Score,
    setPlayer2Score,
    raceTo,
    setRaceTo,
    showRaceToInput,
    setShowRaceToInput,
    tempRaceTo,
    setTempRaceTo,
    handleRaceToChange,
    loading,
    showWinnerModal,
    winner,
    handleWinnerModalClose,
    showPlayer1Modal,
    setShowPlayer1Modal,
    showPlayer2Modal,
    setShowPlayer2Modal,
    handlePlayer1Select,
    handlePlayer2Select,
    getPlayer1Name,
    getPlayer2Name,
    getPlayer1Photo,
    getPlayer2Photo,
    enableBalls,
    pocketedBalls,
    gameMode,
    rackBalls,
    handleBallClick,
    handleResetBalls,
    isStandby,
    setIsStandby,
    scoreboardHidden,
    setScoreboardHidden,
    ballStyle,
    tournamentTitle,
    runningSubtitle,
    saveTournamentTitle,
    saveRunningSubtitle,
  };
}
