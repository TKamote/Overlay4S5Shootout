"use client";

import { ShootoutRemoteController } from "@/components/packs/ShootoutRemoteController";
import { isPackId } from "@/lib/packs";

export default function ShootoutControllerPage({
  params,
}: {
  params: { pack: string; matchId: string };
}) {
  const { pack, matchId } = params;
  if (!isPackId(pack)) {
    return <main className="p-8 text-neutral-600">Unknown overlay pack.</main>;
  }
  return <ShootoutRemoteController packId={pack} matchId={matchId} />;
}
