"use client";

import PlayersManager from "../PlayersManager";

/** Legacy /players/{pack} deep link — still works; prefer /players for Series1. */
export default function PackPlayersPage({ params }: { params: { pack: string } }) {
  return <PlayersManager packFromUrl={params.pack} />;
}
