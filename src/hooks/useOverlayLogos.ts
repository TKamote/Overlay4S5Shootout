"use client";

import { useCallback, useEffect, useState } from "react";
import type { Logo } from "@/components/LogoSelectionModal";
import { listLogosForMatch, setMatchLogo, type LogoRow, type LogoSlot } from "@/lib/logos";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type { LogoSlot };

function toLogo(row: LogoRow): Logo {
  return { id: row.id, name: row.name, logoURL: row.logo_url };
}

export type UseOverlayLogosOptions = {
  canEdit?: boolean;
  editToken?: string | null;
};

/** Three logo slots for one match + family/pack logo library. */
export function useOverlayLogos(
  matchId: string,
  options: UseOverlayLogosOptions = {}
) {
  const { canEdit = false, editToken = null } = options;
  const { ready, isSignedIn, configured } = useAuth();
  const [logo1URL, setLogo1URL] = useState("");
  const [logo2URL, setLogo2URL] = useState("");
  const [logo3URL, setLogo3URL] = useState("");
  const [logos, setLogos] = useState<Logo[]>([]);
  const [showLogo1Modal, setShowLogo1Modal] = useState(false);
  const [showLogo2Modal, setShowLogo2Modal] = useState(false);
  const [showLogo3Modal, setShowLogo3Modal] = useState(false);

  const canLoadLibrary = canEdit || isSignedIn;

  const applySlot = (slot: LogoSlot, url: string) => {
    if (slot === 1) setLogo1URL(url);
    else if (slot === 2) setLogo2URL(url);
    else setLogo3URL(url);
  };

  const refreshLibrary = useCallback(async () => {
    if (!configured || !supabase || !canLoadLibrary) return;
    try {
      const { data: match } = await supabase
        .from("matches")
        .select("family_id, pack_id")
        .eq("id", matchId)
        .maybeSingle();
      if (!match?.family_id || !match?.pack_id) {
        setLogos([]);
        return;
      }
      const rows = await listLogosForMatch(match.family_id as string, match.pack_id as string);
      setLogos(rows.map(toLogo));
    } catch (err) {
      console.error("Failed to load logos", err);
    }
  }, [canLoadLibrary, configured, matchId]);

  useEffect(() => {
    if (!supabase || !ready) return;
    const client = supabase;
    let cancelled = false;

    const load = async () => {
      const { data: match } = await client
        .from("matches")
        .select("logo1_url, logo2_url, logo3_url, family_id, pack_id")
        .eq("id", matchId)
        .maybeSingle();
      if (cancelled || !match) return;
      setLogo1URL(match.logo1_url ? String(match.logo1_url) : "");
      setLogo2URL(match.logo2_url ? String(match.logo2_url) : "");
      setLogo3URL(match.logo3_url ? String(match.logo3_url) : "");
      const familyId = match.family_id as string | null;
      const packId = match.pack_id as string | null;
      if (familyId && packId && canLoadLibrary) {
        try {
          const rows = await listLogosForMatch(familyId, packId);
          if (!cancelled) setLogos(rows.map(toLogo));
        } catch (err) {
          console.error("Failed to load logos", err);
        }
      } else if (!cancelled) {
        setLogos([]);
      }
    };

    void load();
    void refreshLibrary();

    const channel = client
      .channel(`logos:${matchId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as {
            logo1_url?: string | null;
            logo2_url?: string | null;
            logo3_url?: string | null;
          };
          if (!row) return;
          setLogo1URL(row.logo1_url ? String(row.logo1_url) : "");
          setLogo2URL(row.logo2_url ? String(row.logo2_url) : "");
          setLogo3URL(row.logo3_url ? String(row.logo3_url) : "");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logos" },
        () => {
          void refreshLibrary();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [matchId, ready, refreshLibrary, canLoadLibrary]);

  const handleSelectLogo = useCallback(
    (slot: LogoSlot, logo: Logo) => {
      const url = logo.logoURL || "";
      applySlot(slot, url);
      if (!canEdit) return;
      void setMatchLogo(matchId, slot, url, {
        isSignedIn,
        editToken,
      }).catch(console.error);
    },
    [canEdit, editToken, isSignedIn, matchId]
  );

  const handleClearLogo = useCallback(
    (slot: LogoSlot) => {
      applySlot(slot, "");
      if (!canEdit) return;
      void setMatchLogo(matchId, slot, "", {
        isSignedIn,
        editToken,
      }).catch(console.error);
    },
    [canEdit, editToken, isSignedIn, matchId]
  );

  return {
    logo1URL,
    logo2URL,
    logo3URL,
    logos,
    showLogo1Modal,
    showLogo2Modal,
    showLogo3Modal,
    setShowLogo1Modal,
    setShowLogo2Modal,
    setShowLogo3Modal,
    handleSelectLogo,
    handleClearLogo,
    refreshLibrary,
  };
}
