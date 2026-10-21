"use client";

import ShootoutVertical from "@/components/packs/ShootoutVertical";
import { isPackId } from "@/lib/packs";

export default function PackShootoutVerticalOverlayPage({
  params,
}: {
  params: { pack: string; matchId: string };
}) {
  const { pack, matchId } = params;
  if (!isPackId(pack)) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-8 text-neutral-600">
        Unknown overlay pack.
      </main>
    );
  }
  return <ShootoutVertical matchId={matchId} />;
}
