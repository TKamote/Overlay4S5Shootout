import { supabase } from "@/lib/supabase";
import { formatDbError } from "@/lib/dbError";

const BUCKET = "player-photos";

/** Upload a player photo and return its public CDN URL for OBS. */
export async function uploadPlayerPhoto(
  playerId: string,
  file: File,
  scope: { familyId: string; packId: string }
): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${scope.familyId}/${scope.packId}/${playerId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(formatDbError(error, "Photo upload failed"));
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
