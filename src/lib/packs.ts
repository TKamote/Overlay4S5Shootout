import { supabase } from "@/lib/supabase";

/** Fixed Overlay4S1 shootout match. OBS and the phone controller share it. */
export const SHOOTOUT_MATCH_ID = "overlay4s1";

/** Logo and player-photo library for that one shootout. */
export const SHOOTOUT_LIBRARY_ID = "shootout" as const;

export const PACK_IDS = [SHOOTOUT_LIBRARY_ID] as const;
export type PackId = (typeof PACK_IDS)[number];

export const PACK_META: Record<PackId, { name: string; shortName: string }> = {
  shootout: { name: "Shootout", shortName: "Shootout" },
};

export function isPackId(value: string): value is PackId {
  return (PACK_IDS as readonly string[]).includes(value);
}

export type PackGrant = {
  packId: PackId;
  name: string;
  landscapeMatchId: string | null;
  verticalMatchId: string | null;
  landscapeEditToken: string | null;
  verticalEditToken: string | null;
};

async function loadEditTokens(matchIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!supabase || matchIds.length === 0) return map;
  const { data, error } = await supabase
    .from("match_edit_tokens")
    .select("match_id, token")
    .in("match_id", matchIds);
  if (error) {
    console.error("loadEditTokens failed", error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.match_id as string, row.token as string);
  }
  return map;
}

/** Signed-in buyer's granted overlay pairs and OBS match IDs. */
export async function listBuyerGrants(): Promise<PackGrant[]> {
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  const familyId = profile?.family_id as string | null;
  if (!familyId) return [];

  const { data: packRows, error: packError } = await supabase
    .from("family_packs")
    .select("pack_id")
    .eq("family_id", familyId);
  if (packError) throw packError;

  const packIds = (packRows ?? [])
    .map((row) => row.pack_id as string)
    .filter(isPackId);
  if (packIds.length === 0) return [];

  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("id, pack_id, orientation")
    .eq("family_id", familyId)
    .in("pack_id", packIds);
  if (matchError) throw matchError;

  const matchIds = (matches ?? []).map((m) => m.id as string);
  const tokens = await loadEditTokens(matchIds);

  return packIds.map((packId) => {
    const rows = (matches ?? []).filter((m) => m.pack_id === packId);
    const land =
      (rows.find((m) => m.orientation === "landscape")?.id as string | undefined) ?? null;
    const vert =
      (rows.find((m) => m.orientation === "vertical")?.id as string | undefined) ?? null;
    return {
      packId,
      name: PACK_META[packId].name,
      landscapeMatchId: land,
      verticalMatchId: vert,
      landscapeEditToken: land ? tokens.get(land) ?? null : null,
      verticalEditToken: vert ? tokens.get(vert) ?? null : null,
    };
  });
}

/** Demo grants used when Supabase is not configured (local UI preview). */
export function demoGrants(): PackGrant[] {
  return PACK_IDS.map((packId) => ({
    packId,
    name: PACK_META[packId].name,
    landscapeMatchId: "demo",
    verticalMatchId: "demo",
    landscapeEditToken: "demo-edit",
    verticalEditToken: "demo-edit",
  }));
}

/** Shootout OBS browser-source path (no edit token — view only). */
export function shootoutOverlayPath(packId: string, matchId: string): string {
  return `/shootout/${packId}/${matchId}`;
}

/** Shootout controller path with optional ?edit= token. */
export function shootoutControllerPath(
  packId: string,
  matchId: string,
  editToken: string | null
): string {
  const base = `/shootout-remote/${packId}/${matchId}`;
  if (!editToken) return base;
  return `${base}?edit=${encodeURIComponent(editToken)}`;
}
