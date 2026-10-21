"use client";

import { useEffect, useState } from "react";
import { ShootoutRemoteController } from "@/components/packs/ShootoutRemoteController";
import { isPackId, type PackId } from "@/lib/packs";
import { getFamilyId } from "@/lib/players";
import { supabase } from "@/lib/supabase";

const MATCH_ID = "overlay4s1";

/**
 * Primary shootout controller.
 * URL has no pack name; pack_id is resolved only for logo storage.
 */
export default function PrimaryShootoutRemotePage() {
  const [packId, setPackId] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        let resolved: PackId | null = null;
        if (supabase) {
          const { data: match } = await supabase
            .from("matches")
            .select("pack_id")
            .eq("id", MATCH_ID)
            .maybeSingle();
          const { data: shootout } = await supabase
            .from("shootout_matches")
            .select("pack_id")
            .eq("id", MATCH_ID)
            .maybeSingle();
          const raw =
            (match?.pack_id as string | null) || (shootout?.pack_id as string | null);
          if (raw && isPackId(raw)) resolved = raw;

          if (!resolved) {
            const familyId = await getFamilyId();
            if (familyId) {
              const { data: fp } = await supabase
                .from("family_packs")
                .select("pack_id")
                .eq("family_id", familyId)
                .limit(1)
                .maybeSingle();
              const fpPack = fp?.pack_id as string | undefined;
              if (fpPack && isPackId(fpPack)) resolved = fpPack;
            }
          }
        }
        if (!cancelled) {
          if (!resolved) {
            setError("Could not resolve logo library for this account.");
            return;
          }
          setPackId(resolved);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load controller");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!packId) return <div className="p-8">Loading...</div>;
  return <ShootoutRemoteController packId={packId} matchId={MATCH_ID} />;
}
