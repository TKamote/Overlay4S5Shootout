"use client";

import { useEffect, useState } from "react";
import { useIsPhone } from "@/hooks/useIsPhone";

function readViewParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("view");
}

/**
 * Overlay vs Controller view:
 * - view=controller → always phone remote
 * - view=overlay → always OBS scoreboard
 * - (default) → phone-width remote, else scoreboard (OBS-friendly)
 */
export function useOverlayViewMode(): "remote" | "scoreboard" {
  const isPhone = useIsPhone();
  const [view, setView] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setView(readViewParam());
    sync();
    setReady(true);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Until client reads ?view=, prefer scoreboard (safe for OBS Browser Sources).
  if (!ready) return "scoreboard";
  if (view === "controller") return "remote";
  if (view === "overlay") return "scoreboard";
  return isPhone ? "remote" : "scoreboard";
}
