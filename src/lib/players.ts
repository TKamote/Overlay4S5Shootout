import { supabase } from "@/lib/supabase";

export type PlayerRow = {
  id: string;
  family_id: string;
  pack_id: string;
  name: string;
  photo_url: string | null;
  points: number;
  created_at?: string;
};

export async function getFamilyId(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getFamilyId failed", error);
    return null;
  }
  return data?.family_id ?? null;
}

export async function listPlayers(familyId: string, packId: string): Promise<PlayerRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, family_id, pack_id, name, photo_url, points, created_at")
    .eq("family_id", familyId)
    .eq("pack_id", packId)
    .order("points", { ascending: false });

  if (error) {
    console.error("listPlayers failed", error);
    throw error;
  }
  return (data as PlayerRow[]) ?? [];
}

export async function createPlayer(input: {
  familyId: string;
  packId: string;
  name: string;
  points?: number;
}): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("players")
    .insert({
      family_id: input.familyId,
      pack_id: input.packId,
      name: input.name.trim(),
      points: input.points ?? 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updatePlayer(
  id: string,
  patch: { name?: string; points?: number; photo_url?: string | null }
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.points !== undefined) payload.points = patch.points;
  if (patch.photo_url !== undefined) payload.photo_url = patch.photo_url;

  const { error } = await supabase.from("players").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deletePlayer(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}
