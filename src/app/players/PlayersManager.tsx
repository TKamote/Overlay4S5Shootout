"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BallStylePicker } from "@/components/balls/BallStylePicker";
import GameModeControl from "@/components/GameModeControl";
import { useAuth } from "@/hooks/useAuth";
import { type GameMode } from "@/hooks/useOverlayMatch";
import { DEFAULT_BALL_STYLE, parseBallStyle, type BallStyleId } from "@/lib/ballStyles";
import { isCurrentUserAdmin } from "@/lib/admin";
import { deleteLogo, listLogos, uploadOverlayLogo, type LogoRow } from "@/lib/logos";
import { isPackId, listBuyerGrants, type PackId } from "@/lib/packs";
import { uploadPlayerPhoto } from "@/lib/playerPhotos";
import {
  createPlayer,
  deletePlayer,
  getFamilyId,
  listPlayers,
  updatePlayer,
  type PlayerRow,
} from "@/lib/players";
import { supabase } from "@/lib/supabase";

function placeholderFor(player: PlayerRow): string {
  const hash = player.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `/avatar-placeholder-${(hash % 6) + 1}.svg`;
}

function parseGameMode(value: string | null | undefined): GameMode {
  if (value === "9-ball" || value === "10-ball" || value === "8-ball" || value === "15-ball") {
    return value;
  }
  return "9-ball";
}

type FormState = {
  name: string;
  points: string;
  photo: File | null;
};

const emptyForm = (): FormState => ({ name: "", points: "0", photo: null });

/** Overlays4 Series1 players/logos manager. Optional packFromUrl for legacy /players/{pack} links. */
export default function PlayersManager({ packFromUrl }: { packFromUrl?: string }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl p-8">
          <p className="text-neutral-600">Loading players…</p>
        </main>
      }
    >
      <PlayersManagerInner packFromUrl={packFromUrl} />
    </Suspense>
  );
}

async function resolveSeries1PackId(): Promise<PackId | null> {
  if (!supabase) return null;
  const { data: match } = await supabase
    .from("matches")
    .select("pack_id")
    .eq("id", "overlay4s1")
    .maybeSingle();
  const fromMatch = match?.pack_id as string | undefined;
  if (fromMatch && isPackId(fromMatch)) return fromMatch;

  const familyId = await getFamilyId();
  if (familyId) {
    const { data: fp } = await supabase
      .from("family_packs")
      .select("pack_id")
      .eq("family_id", familyId)
      .limit(1)
      .maybeSingle();
    const fromFp = fp?.pack_id as string | undefined;
    if (fromFp && isPackId(fromFp)) return fromFp;
  }
  return null;
}

function PlayersManagerInner({ packFromUrl }: { packFromUrl?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyQuery = searchParams.get("family");
  const { ready, isSignedIn, configured } = useAuth();
  const [packId, setPackId] = useState<PackId | null>(
    packFromUrl && isPackId(packFromUrl) ? packFromUrl : null
  );
  const [packReady, setPackReady] = useState(Boolean(packFromUrl && isPackId(packFromUrl)));
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [actingAsAdmin, setActingAsAdmin] = useState(false);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [logos, setLogos] = useState<LogoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoSaving, setLogoSaving] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("9-ball");
  const [ballStyle, setBallStyle] = useState<BallStyleId>(DEFAULT_BALL_STYLE);
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [gameModeSaving, setGameModeSaving] = useState(false);
  const [ballStyleSaving, setBallStyleSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (packId) {
      setPackReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const resolved = await resolveSeries1PackId();
      if (cancelled) return;
      if (!resolved) {
        setError("Could not resolve players library for Overlays4 Series1.");
        setPackReady(true);
        setLoading(false);
        return;
      }
      setPackId(resolved);
      setPackReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const loadRoster = useCallback(async () => {
    if (!configured || !isSignedIn || !packId) return;
    try {
      setLoading(true);
      setError(null);
      const admin = await isCurrentUserAdmin();
      let fid: string | null = null;
      let asAdmin = false;

      if (familyQuery && admin) {
        fid = familyQuery;
        asAdmin = true;
      } else {
        fid = await getFamilyId();
        if (!fid) {
          setError(
            "Your login is not linked to a family. Ask the admin to run link_buyer_email."
          );
          setPlayers([]);
          setLogos([]);
          setMatchIds([]);
          setActingAsAdmin(false);
          return;
        }
        if (!admin && packFromUrl) {
          const grants = await listBuyerGrants();
          if (!grants.some((g) => g.packId === packId)) {
            setError("You do not have this overlay pack.");
            setPlayers([]);
            setLogos([]);
            setMatchIds([]);
            setActingAsAdmin(false);
            return;
          }
        }
      }

      setFamilyId(fid);
      setActingAsAdmin(asAdmin);
      let playerRows = await listPlayers(fid, packId);
      let logoRows = await listLogos(fid, packId);
      // Series1 / mixed: fall back to all family players & logos if this pack slice is empty.
      if (playerRows.length === 0 && supabase) {
        const { data } = await supabase
          .from("players")
          .select("id, family_id, pack_id, name, photo_url, points, created_at")
          .eq("family_id", fid)
          .order("name", { ascending: true });
        playerRows = (data as PlayerRow[]) ?? [];
      }
      if (logoRows.length === 0 && supabase) {
        const { data } = await supabase
          .from("logos")
          .select("id, family_id, pack_id, name, logo_url, created_at")
          .eq("family_id", fid)
          .order("name", { ascending: true });
        logoRows = (data as LogoRow[]) ?? [];
      }

      const packMatches = supabase
        ? await supabase
            .from("matches")
            .select("id, orientation, game_mode, ball_style")
            .eq("family_id", fid)
            .eq("pack_id", packId)
        : { data: null, error: null };
      if (packMatches.error) throw packMatches.error;

      const legacyMatches = supabase
        ? await supabase
            .from("matches")
            .select("id, orientation, game_mode, ball_style")
            .in("id", ["overlay4s1", "overlay4s1-vertical"])
        : { data: null, error: null };
      if (legacyMatches.error) throw legacyMatches.error;

      type MatchLite = {
        id: string;
        orientation: string;
        game_mode: string | null;
        ball_style: string | null;
      };
      const byId = new Map<string, MatchLite>();
      for (const m of [...(packMatches.data ?? []), ...(legacyMatches.data ?? [])]) {
        byId.set(m.id as string, m as MatchLite);
      }
      const matches = Array.from(byId.values());
      const ids = matches.map((m) => m.id);
      const land = matches.find((m) => m.id === "overlay4s1") ?? matches.find((m) => m.orientation === "landscape");
      const vert =
        matches.find((m) => m.id === "overlay4s1-vertical") ??
        matches.find((m) => m.orientation === "vertical");
      const modeSource = land ?? vert;
      if (mountedRef.current) {
        setPlayers(playerRows);
        setLogos(logoRows);
        setMatchIds(ids);
        setGameMode(parseGameMode(modeSource?.game_mode as string | null));
        setBallStyle(parseBallStyle(modeSource?.ball_style));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load players");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [configured, isSignedIn, packId, familyQuery, packFromUrl]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !packReady) return;
    if (!configured) {
      setLoading(false);
      return;
    }
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    if (!packId) return;
    void loadRoster();
  }, [ready, packReady, configured, isSignedIn, router, packId, loadRoster]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setPhotoPreview(null);
    setShowForm(true);
  };

  const openEdit = (player: PlayerRow) => {
    setEditing(player);
    setForm({
      name: player.name,
      points: String(player.points),
      photo: null,
    });
    setPhotoPreview(player.photo_url);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
  };

  const onPhotoChange = (file: File | null) => {
    setForm((f) => ({ ...f, photo: file }));
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    if (file) setPhotoPreview(URL.createObjectURL(file));
    else if (editing?.photo_url) setPhotoPreview(editing.photo_url);
    else setPhotoPreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!familyId || !packId) {
      setError("Your login is not linked to this overlay pack.");
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 0) {
      setError("Points must be a number ≥ 0");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let playerId: string;
      if (editing) {
        playerId = editing.id;
        await updatePlayer(playerId, { name, points });
      } else {
        playerId = await createPlayer({ familyId, packId, name, points });
      }

      if (form.photo) {
        const url = await uploadPlayerPhoto(playerId, form.photo, { familyId, packId });
        await updatePlayer(playerId, { photo_url: url });
      }

      closeForm();
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (player: PlayerRow) => {
    if (!confirm(`Delete ${player.name}?`)) return;
    setError(null);
    try {
      await deletePlayer(player.id);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleLogoUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!logoFile) {
      setError("Choose a logo image to upload");
      return;
    }
    setLogoSaving(true);
    setError(null);
    try {
      if (!packId || !familyId) return;
      await uploadOverlayLogo(logoFile, logoName || logoFile.name, packId, familyId);
      setLogoFile(null);
      setLogoName("");
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setLogoSaving(false);
    }
  };

  const handleLogoDelete = async (logo: LogoRow) => {
    if (!confirm(`Delete logo ${logo.name}?`)) return;
    setError(null);
    try {
      await deleteLogo(logo.id);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo delete failed");
    }
  };

  const handleGameModeChange = async (mode: GameMode) => {
    if (!supabase || matchIds.length === 0) {
      setError("No overlay matches found for this pack.");
      return;
    }
    setGameModeSaving(true);
    setError(null);
    const previous = gameMode;
    setGameMode(mode);
    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          game_mode: mode,
          pocketed_balls: [],
          updated_at: new Date().toISOString(),
        })
        .in("id", matchIds);
      if (updateError) throw updateError;
    } catch (err) {
      setGameMode(previous);
      setError(err instanceof Error ? err.message : "Failed to update game mode");
    } finally {
      setGameModeSaving(false);
    }
  };

  /** Persist visual ball set to landscape and vertical matches. */
  const handleBallStyleChange = async (style: BallStyleId) => {
    if (!supabase || matchIds.length === 0) {
      setError("No overlay matches found for this pack.");
      return;
    }
    setBallStyleSaving(true);
    setError(null);
    const previous = ballStyle;
    setBallStyle(style);
    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          ball_style: style,
          updated_at: new Date().toISOString(),
        })
        .in("id", matchIds);
      if (updateError) throw updateError;
    } catch (err) {
      setBallStyle(previous);
      setError(err instanceof Error ? err.message : "Failed to update ball style");
    } finally {
      setBallStyleSaving(false);
    }
  };

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!packReady || (!packId && !error)) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-600">Loading players…</p>
      </main>
    );
  }

  if (!packId) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="mt-4 text-neutral-600">
          {error || "Could not load Overlays4 Series1 players library."}
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Back home
        </Link>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="mt-4 text-neutral-600">
          Supabase is not configured. Add <code>.env.local</code> first.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Back home
        </Link>
      </main>
    );
  }

  if (!ready || loading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-600">Loading players…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl p-6 pb-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overlays4 Series1 players</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Roster and logos for this pair only (landscape and vertical share them).
            {actingAsAdmin && (
              <>
                {" "}
                <span className="font-medium text-amber-800">Admin view</span>
                {" · "}
                <Link href="/admin" className="underline">
                  Back to admin
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm underline">
          Home
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mb-6 rounded-lg border border-neutral-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Game</h2>
            <p className="mt-1 text-sm text-neutral-600">
              9-ball / 10-ball show the rack on overlays; 8 hides balls. Applies to landscape and
              vertical.
            </p>
          </div>
          <div className={gameModeSaving || matchIds.length === 0 ? "pointer-events-none opacity-60" : ""}>
            <GameModeControl
              gameMode={gameMode}
              canEdit={matchIds.length > 0 && !gameModeSaving}
              onChange={(mode) => void handleGameModeChange(mode)}
            />
          </div>
        </div>
      </section>

      <section className="mb-6">
        <BallStylePicker
          ballStyle={ballStyle}
          onSelect={(style) => void handleBallStyleChange(style)}
          canEdit={matchIds.length > 0 && !ballStyleSaving}
          saving={ballStyleSaving}
        />
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search players…"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2"
        />
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-800"
        >
          Add player
        </button>
      </div>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {filtered.length === 0 ? (
          <li className="p-6 text-center text-neutral-500">
            {searchQuery ? "No players match your search." : "No players yet."}
          </li>
        ) : (
          filtered.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-4 p-4"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={player.photo_url || placeholderFor(player)}
                  alt={player.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{player.name}</p>
                <p className="text-sm text-neutral-500">{player.points} pts</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(player)}
                  className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(player)}
                  className="rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Logos</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Upload logos here, then assign left/right slots on this pack’s landscape overlay when
          signed in.
        </p>

        <form
          onSubmit={handleLogoUpload}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Name
            <input
              value={logoName}
              onChange={(e) => setLogoName(e.target.value)}
              placeholder="Sponsor name"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={logoSaving}
            className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {logoSaving ? "Uploading…" : "Upload logo"}
          </button>
        </form>

        <ul className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {logos.length === 0 ? (
            <li className="p-6 text-center text-neutral-500">No logos yet.</li>
          ) : (
            logos.map((logo) => (
              <li key={logo.id} className="flex items-center gap-4 p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.logo_url}
                    alt={logo.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="min-w-0 flex-1 truncate font-semibold">{logo.name}</p>
                <button
                  type="button"
                  onClick={() => void handleLogoDelete(logo)}
                  className="rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold">
              {editing ? "Edit player" : "Add player"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Points
                <input
                  type="number"
                  min={0}
                  value={form.points}
                  onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Photo (JPEG or PNG)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
              </label>
              {photoPreview && (
                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-lg">
                  <Image
                    src={photoPreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-neutral-900 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-lg border border-neutral-300 py-2 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
