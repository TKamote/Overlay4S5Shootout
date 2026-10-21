import { supabase } from "@/lib/supabase";
import { isPackId, PACK_META, type PackId } from "@/lib/packs";

export type AdminOverlayRow = {
  familyId: string;
  familyName: string;
  packId: PackId;
  orientation: "landscape" | "vertical" | string;
  matchId: string;
};

export type AdminPair = {
  familyId: string;
  familyName: string;
  packId: PackId;
  packName: string;
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
    console.error("admin loadEditTokens failed", error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.match_id as string, row.token as string);
  }
  return map;
}

/** Whether the signed-in user has profiles.is_admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("isCurrentUserAdmin failed", error);
    return false;
  }
  return Boolean(data?.is_admin);
}

/** Flat match rows from admin_list_overlays, grouped into pairs. */
export async function adminListPairs(): Promise<AdminPair[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_list_overlays");
  if (error) throw error;

  const map = new Map<string, AdminPair>();
  const matchIds: string[] = [];
  for (const row of data ?? []) {
    const packId = row.pack_id as string;
    if (!isPackId(packId)) continue;
    const familyId = row.family_id as string;
    const key = `${familyId}:${packId}`;
    let pair = map.get(key);
    if (!pair) {
      pair = {
        familyId,
        familyName: (row.family_name as string) || "Family",
        packId,
        packName: PACK_META[packId].name,
        landscapeMatchId: null,
        verticalMatchId: null,
        landscapeEditToken: null,
        verticalEditToken: null,
      };
      map.set(key, pair);
    }
    const orientation = row.orientation as string;
    const matchId = row.match_id as string;
    matchIds.push(matchId);
    if (orientation === "landscape") pair.landscapeMatchId = matchId;
    if (orientation === "vertical") pair.verticalMatchId = matchId;
  }

  const tokens = await loadEditTokens(matchIds);
  for (const pair of Array.from(map.values())) {
    if (pair.landscapeMatchId) {
      pair.landscapeEditToken = tokens.get(pair.landscapeMatchId) ?? null;
    }
    if (pair.verticalMatchId) {
      pair.verticalEditToken = tokens.get(pair.verticalMatchId) ?? null;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const byName = a.familyName.localeCompare(b.familyName);
    if (byName !== 0) return byName;
    return a.packId.localeCompare(b.packId);
  });
}

export async function adminProvisionBuyer(
  familyName: string,
  packId: PackId
): Promise<AdminPair> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc("provision_buyer", {
    p_family_name: familyName.trim(),
    p_pack_id: packId,
  });
  if (error) throw error;

  const rows = data as {
    family_id: string;
    pack_id: string;
    orientation: string;
    match_id: string;
  }[];
  const familyId = rows[0]?.family_id;
  if (!familyId) throw new Error("provision_buyer returned no rows");

  const landscapeMatchId =
    rows.find((r) => r.orientation === "landscape")?.match_id ?? null;
  const verticalMatchId =
    rows.find((r) => r.orientation === "vertical")?.match_id ?? null;
  const tokens = await loadEditTokens(
    [landscapeMatchId, verticalMatchId].filter(Boolean) as string[]
  );

  return {
    familyId,
    familyName: familyName.trim(),
    packId,
    packName: PACK_META[packId].name,
    landscapeMatchId,
    verticalMatchId,
    landscapeEditToken: landscapeMatchId
      ? tokens.get(landscapeMatchId) ?? null
      : null,
    verticalEditToken: verticalMatchId
      ? tokens.get(verticalMatchId) ?? null
      : null,
  };
}

export async function adminLinkBuyerEmail(
  email: string,
  familyId: string
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.rpc("link_buyer_email", {
    p_email: email.trim(),
    p_family_id: familyId,
  });
  if (error) throw error;
}
