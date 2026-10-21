"use client";

import { ShootoutRemoteController } from "@/components/packs/ShootoutRemoteController";
import { SHOOTOUT_LIBRARY_ID, SHOOTOUT_MATCH_ID } from "@/lib/packs";

/**
 * Phone controller for the one shootout match.
 * Logos are stored under the shootout library, not an overlay pack.
 */
export default function PrimaryShootoutRemotePage() {
  return (
    <ShootoutRemoteController packId={SHOOTOUT_LIBRARY_ID} matchId={SHOOTOUT_MATCH_ID} />
  );
}
