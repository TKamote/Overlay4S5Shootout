import { supabase } from "@/lib/supabase";

const ALLOWED_KEYS = new Set([
  "player1_score",
  "player2_score",
  "race_to",
  "pocketed_balls",
  "game_mode",
  "player1_id",
  "player2_id",
  "logo1_url",
  "logo2_url",
  "logo3_url",
  "is_standby",
  "ball_style",
  "tournament_title",
  "running_subtitle",
  "scoreboard_hidden",
]);

export type PersistAuth = {
  isSignedIn: boolean;
  editToken: string | null;
};

/** Persist match fields via auth UPDATE or edit-token RPC. */
export async function persistMatchPatch(
  matchId: string,
  patch: Record<string, unknown>,
  auth: PersistAuth
): Promise<void> {
  if (!supabase) return;

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (ALLOWED_KEYS.has(key)) clean[key] = value;
  }
  if (Object.keys(clean).length === 0) return;

  clean.updated_at = new Date().toISOString();

  if (auth.isSignedIn) {
    const { error } = await supabase.from("matches").update(clean).eq("id", matchId);
    if (error) console.error("match update failed", error);
    return;
  }

  if (auth.editToken) {
    const { error } = await supabase.rpc("update_match_with_token", {
      p_match_id: matchId,
      p_token: auth.editToken,
      p_patch: clean,
    });
    if (error) console.error("match token update failed", error);
  }
}

const PACK_MATCH_IDS = ["overlay4s1", "overlay4s1-vertical"] as const;

/** Persist the same patch to landscape + vertical pack matches. */
export async function persistMatchPatchOnPack(
  matchId: string,
  packId: string | null,
  familyId: string | null,
  patch: Record<string, unknown>,
  auth: PersistAuth
): Promise<void> {
  if (!supabase) return;

  const ids = new Set<string>([matchId, ...PACK_MATCH_IDS]);
  if (packId && familyId) {
    const { data } = await supabase
      .from("matches")
      .select("id")
      .eq("pack_id", packId)
      .eq("family_id", familyId);
    for (const row of data ?? []) {
      if (typeof row.id === "string") ids.add(row.id);
    }
  }

  await Promise.all([...ids].map((id) => persistMatchPatch(id, patch, auth)));
}
