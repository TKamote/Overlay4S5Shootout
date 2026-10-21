import { supabase } from "@/lib/supabase";
import { getFamilyId } from "@/lib/players";
import { persistMatchPatch, type PersistAuth } from "@/lib/matchPersist";

/** Keep S1 bucket name `logos` (S2 uses overlay-logos). */
const BUCKET = "logos";

export type LogoRow = {
  id: string;
  family_id: string;
  pack_id: string;
  name: string;
  logo_url: string;
  created_at?: string;
};

export async function listLogos(familyId: string, packId: string): Promise<LogoRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("logos")
    .select("id, family_id, pack_id, name, logo_url, created_at")
    .eq("family_id", familyId)
    .eq("pack_id", packId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as LogoRow[]) ?? [];
}

export async function uploadOverlayLogo(
  file: File,
  name: string,
  packId: string,
  familyIdOverride?: string | null
): Promise<LogoRow> {
  if (!supabase) throw new Error("Supabase not configured");
  const familyId = familyIdOverride || (await getFamilyId());
  if (!familyId) throw new Error("No family linked to your account");

  const ext = file.name.split(".").pop() || "png";
  const path = `${familyId}/${packId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const logoUrl = pub.publicUrl;

  const { data, error } = await supabase
    .from("logos")
    .insert({
      family_id: familyId,
      pack_id: packId,
      name: name.trim() || file.name,
      logo_url: logoUrl,
    })
    .select("id, family_id, pack_id, name, logo_url, created_at")
    .single();

  if (error) throw error;
  return data as LogoRow;
}

export async function deleteLogo(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("logos").delete().eq("id", id);
  if (error) throw error;
}

export type LogoSlot = 1 | 2 | 3;

/** Pack logos first; if none, all logos for the family (same as Manage players). */
export async function listLogosForMatch(familyId: string, packId: string): Promise<LogoRow[]> {
  const packRows = await listLogos(familyId, packId);
  if (packRows.length > 0 || !supabase) return packRows;
  const { data, error } = await supabase
    .from("logos")
    .select("id, family_id, pack_id, name, logo_url, created_at")
    .eq("family_id", familyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as LogoRow[]) ?? [];
}

export async function setMatchLogo(
  matchId: string,
  slot: LogoSlot,
  logoUrl: string,
  auth?: PersistAuth
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const field = slot === 1 ? "logo1_url" : slot === 2 ? "logo2_url" : "logo3_url";
  const patch = { [field]: logoUrl };
  if (auth) {
    await persistMatchPatch(matchId, patch, auth);
    return;
  }
  const { error } = await supabase
    .from("matches")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
}
